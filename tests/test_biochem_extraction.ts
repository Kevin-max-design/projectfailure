import { LocalExtractionProvider } from '../src/lib/providers/local-extraction-provider';

const ocrText = `
“ver FUNCTION. TEST WITH PROTEINS 0.3 - 1.2: mo/dl
"Direct Bilirubin 0.1 ma/dl andi eee) Bilirubin) | ass \\ WY Mi ve | 24 IU/L Male 10.0 - 40.0 IU/L without Pyridoxal Phosphate \\ t ; j i Activation (IFCC) i | 27 W/L, Y 15.0 - 41.0 IU/L Without Pyridoxal Phosphate "ONE alae ; STN ae raale Activation (FCC) «© nd 133 IU/L 32.0 - 120.0 IU/L “ Ifec Modified 6.6 om/dl all 6.5 - 8.1 gm/dl : Bluret. 4.0 gm/dl | i ( 3,5- 5.0 gm/dl ‘Bromocresol Green, 2.6 om/di > 2,0 3.5 ‘gm/dl iN | 1.54 di LOAN IAIN
‘LDL Cholesterol
tk Railway Stat Bator Officd Road, Nandi “ce NandUal, AP 18514 292 989/295 555
a eer eet com w EPARTMENT OF BIOCHEMISTRY 121, Y(s) / Male
UDAYANANDA HOSPITALS
fi
\\ hae/ ‘Gender Admn/UMRNo : 1p26050346 / UMR25031262 aiuete s3-May 2006 ‘6:26 AM ill No/Result No. :SER260501789 / ReS260503082 + 13-May-2026 06:58 AM Ward/Room/Bed ‘2ND FLR SHARING ROOMS/212/SHR-17 YDR.Bhargava Reddy N Org.Name: t a i Ne i Serum
Specimen
Method 2
Results Biological Reference ‘ Vox method
otal Bilirubin | 0.4. mo/di | 0.0- 0.2 mo/dl Diazotized Sulfanilic Acid
`;

async function testExtraction() {
  const provider = new LocalExtractionProvider();
  const res = await provider.extractMedicalData(ocrText);
  console.log('Extracted labs count:', res.labResults?.length);
  console.log('Extracted labs:', JSON.stringify(res.labResults, null, 2));
}

testExtraction();
