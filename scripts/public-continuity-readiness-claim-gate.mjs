import {createHash,verify as cryptoVerify} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const canonical=v=>Array.isArray(v)?`[${v.map(canonical).join(',')}]`:v&&typeof v==='object'?`{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`:JSON.stringify(v);
const fail=(code,detail='')=>{const e=new Error(`${code}${detail?`: ${detail}`:''}`);e.code=code;throw e};
const readJson=async p=>JSON.parse(await readFile(new URL(`../${p}`,import.meta.url),'utf8'));
const allowFixture=process.argv.includes('--allow-fixture');
const now=allowFixture?'2026-07-18T14:00:00.000Z':new Date().toISOString();
const [claim,registry,promotion]=await Promise.all([
  readJson('generated/publication-readiness.claim.json'),
  readJson('trust/continuity-readiness-keys.json'),
  readJson('generated/public-release.promotion.json')
]);
const expectedKeys=['claimId','continuityPolicyDigest','continuityPolicyVersion','fixtureOnly','issuedAt','owner','privateReceiptDigest','promotionSequence','readinessVerdict','releaseId','schemaVersion','signature','signatureAlgorithm','signingKeyId','targetBranch','targetRepository','validUntil'].sort();
const actualKeys=Object.keys(claim).sort();if(canonical(actualKeys)!==canonical(expectedKeys))fail('MMJ_05N_I_PUBLIC_CLAIM_SCHEMA_DRIFT');
const forbidden=/(archive|bucket|vault|checkpointPath|incident|credential|accountId|rpoGap|rtoPhase|privateMedia)/i;for(const key of actualKeys)if(forbidden.test(key))fail('MMJ_05N_I_PUBLIC_CLAIM_DISCLOSURE',key);
const payload=promotion.payload??promotion;
if(claim.targetRepository!=='MAMIJAismanager/MMJ-site'||claim.targetBranch!=='main')fail('MMJ_05N_I_CLAIM_TARGET_MISMATCH');
if(claim.releaseId!==payload.releaseId||claim.promotionSequence!==payload.promotionSequence)fail('MMJ_05N_I_CLAIM_RELEASE_MISMATCH');
if(Date.parse(claim.issuedAt)>Date.parse(now)+300000)fail('MMJ_05N_I_CLAIM_FUTURE_ISSUED');
if(Date.parse(claim.validUntil)<=Date.parse(now))fail('MMJ_05N_I_CLAIM_EXPIRED');
if(claim.fixtureOnly&&!allowFixture)fail('MMJ_05N_I_FIXTURE_CLAIM_FORBIDDEN');
if(!allowFixture&&claim.readinessVerdict!=='CURRENT')fail('MMJ_05N_I_CLAIM_NOT_CURRENT');
const key=registry.keys.find(x=>x.keyId===claim.signingKeyId);if(!key)fail('MMJ_05N_I_CLAIM_SIGNER_UNKNOWN');if(key.status==='revoked')fail('MMJ_05N_I_CLAIM_SIGNER_REVOKED');
const copy={...claim};delete copy.signature;const bytes=Buffer.from(`MMJ-05N-I-READINESS-CLAIM-V1\n${canonical(copy)}`);
if(!cryptoVerify(null,bytes,key.publicKeyPem,Buffer.from(claim.signature,'base64url')))fail('MMJ_05N_I_CLAIM_SIGNATURE_INVALID');
console.log(JSON.stringify({gate:'PASS_MMJ_05N_I_PUBLIC_CLAIM',claimId:claim.claimId,fixtureOnly:claim.fixtureOnly,readinessVerdict:claim.readinessVerdict,strictProduction:!allowFixture,claimDigest:'sha256:'+createHash('sha256').update(canonical(claim)).digest('hex')},null,2));
