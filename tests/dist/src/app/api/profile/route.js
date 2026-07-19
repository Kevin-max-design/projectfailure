"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DELETE = DELETE;
const server_1 = require("next/server");
const server_2 = require("@/lib/supabase/server");
const mode_1 = require("@/lib/mode");
async function DELETE(request) {
    if ((0, mode_1.isDemoMode)()) {
        return server_1.NextResponse.json({ error: 'Demo mode is active' }, { status: 400 });
    }
    try {
        const supabase = await (0, server_2.createClient)();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return server_1.NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        // Resolve patient profile
        const { data: patient } = await supabase
            .from('patients')
            .select('id')
            .eq('user_id', user.id)
            .single();
        if (!patient) {
            return server_1.NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
        }
        const patientId = patient.id;
        const adminSupabase = (0, server_2.createAdminClient)();
        // 1. Retrieve all storage paths for this patient's documents to delete them from storage
        const { data: docs } = await adminSupabase
            .from('documents')
            .select('storage_path')
            .eq('patient_id', patientId);
        if (docs && docs.length > 0) {
            const pathsToRemove = docs
                .map((d) => d.storage_path)
                .filter((path) => !!path);
            if (pathsToRemove.length > 0) {
                const { error: storageRemoveError } = await adminSupabase.storage
                    .from('medical-records')
                    .remove(pathsToRemove);
                if (storageRemoveError) {
                    console.error('Failed to remove patient documents from storage during account delete:', storageRemoveError);
                }
            }
        }
        // 2. Delete patient row. Cascading foreign keys will automatically delete all sub-records 
        // (documents, diagnoses, medications, labs, procedures, chunks, help sessions, doctor briefs, share tokens, configs, logs).
        const { error: patientDeleteError } = await adminSupabase
            .from('patients')
            .delete()
            .eq('id', patientId);
        if (patientDeleteError) {
            console.error('Failed to delete patient profile from DB:', patientDeleteError);
            return server_1.NextResponse.json({ error: 'Failed to delete clinical database records' }, { status: 500 });
        }
        // Also delete profiles table row
        await adminSupabase.from('profiles').delete().eq('id', user.id);
        // 3. Delete auth user account using admin client
        const { error: authDeleteError } = await adminSupabase.auth.admin.deleteUser(user.id);
        if (authDeleteError) {
            console.error('Failed to delete user auth account:', authDeleteError);
            return server_1.NextResponse.json({ error: 'Failed to delete authentication account' }, { status: 500 });
        }
        return server_1.NextResponse.json({ success: true, message: 'Account and all health data deleted successfully.' });
    }
    catch (err) {
        console.error('Account deletion API error:', err);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
