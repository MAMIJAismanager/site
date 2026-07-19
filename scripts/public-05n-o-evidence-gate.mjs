import {verifyCurrentPublicEvidence} from './public-05n-o-core.mjs';
const allowFixture=process.argv.includes('--allow-fixture');
const result=verifyCurrentPublicEvidence({allowFixture});
console.log(JSON.stringify({event:'PASS_MMJ_05N_O_PUBLIC_EVIDENCE',allowFixture,...result},null,2));
