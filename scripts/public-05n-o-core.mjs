import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function fail(code,detail=''){const e=new Error(`${code}${detail?':'+detail:''}`);e.code=code;throw e;}
export function assert(c,code,d=''){if(!c)fail(code,d);}
export function validateFirstReleaseReadinessV2(c,{strict=true}={}){
 assert(c.schemaVersion===2,'MMJ_05N_O_PUBLIC_I_SCHEMA_V2_REQUIRED');
 assert(c.continuityMode==='FIRST_PRODUCTION_BOOTSTRAP','MMJ_05N_O_PUBLIC_I_MODE_INVALID');
 assert(c.readinessVerdict==='FIRST_RELEASE_READY','MMJ_05N_O_PUBLIC_I_FIRST_RELEASE_NOT_READY');
 assert(/^rel_[0-9a-f]{24,32}$/.test(c.releaseId),'MMJ_05N_O_PUBLIC_I_RELEASE_INVALID');
 assert(Number.isInteger(c.promotionSequence)&&c.promotionSequence>0,'MMJ_05N_O_PUBLIC_I_SEQUENCE_INVALID');
 for(const k of ['sealedArtifactDigest','checkpointDigest','firstReleaseObligationDigest'])assert(/^sha256:[0-9a-f]{64}$/.test(c[k]),'MMJ_05N_O_PUBLIC_I_DIGEST_INVALID',k);
 assert(c.rtoEvidenceClass==='SHADOW_MEASURED'||c.rtoEvidenceClass==='PRODUCTION_RECOVERY_MEASURED','MMJ_05N_O_PUBLIC_I_RTO_CLASS_INVALID');
 assert(Number.isInteger(c.trustEpochSequence)&&c.trustEpochSequence>0,'MMJ_05N_O_PUBLIC_I_EPOCH_INVALID');
 assert(Date.parse(c.validUntil)>Date.parse(c.issuedAt),'MMJ_05N_O_PUBLIC_I_EXPIRED');
 if(strict)assert(c.fixtureOnly===false,'MMJ_05N_O_PUBLIC_FIXTURE_EVIDENCE_FORBIDDEN');
 const forbidden=/(storageLocation|copyId|restoreCommand|bucket|vault|credential|privateKey|operatorIdentity|accountId)/i;
 for(const k of Object.keys(c))assert(!forbidden.test(k),'MMJ_05N_O_PUBLIC_I_DISCLOSURE',k);
 return true;
}
export function validateMFirstReleasePredicate({readiness,nEpoch,priorPromotedReceiptCount,obligationConsumed}){
 validateFirstReleaseReadinessV2(readiness,{strict:true});
 assert(nEpoch.mode==='PRODUCTION'&&nEpoch.activationStatus==='active'&&nEpoch.fixtureOnly===false,'MMJ_05N_O_PUBLIC_M_EPOCH_NOT_ACTIVE');
 assert(nEpoch.bootstrapTransition==='FIXTURE_TO_PRODUCTION','MMJ_05N_O_PUBLIC_M_BOOTSTRAP_TRANSITION_INVALID');
 assert(priorPromotedReceiptCount===0,'MMJ_05N_O_PUBLIC_M_PRIOR_PRODUCTION_EXISTS');
 assert(obligationConsumed===false,'MMJ_05N_O_PUBLIC_M_FIRST_RELEASE_OBLIGATION_CONSUMED');
 return true;
}
function run(script,args=[]){const r=spawnSync(process.execPath,[path.join(root,'scripts',script),...args],{cwd:root,encoding:'utf8'});if(r.status!==0)fail('MMJ_05N_O_PUBLIC_LEAF_GATE_FAILED',`${script}:${r.stderr||r.stdout}`);return r.stdout.trim();}
export function verifyCurrentPublicEvidence({allowFixture=false}={}){
 const args=allowFixture?['--allow-fixture']:[];
 const outputs={
  build:run('public-build-provenance-gate.mjs',args),
  security:run('public-software-composition-security-gate.mjs',args),
  continuity:run('public-continuity-readiness-claim-gate.mjs',args),
  admission:run('public-release-admission-passport-gate.mjs',args)
 };
 return{status:allowFixture?'VERIFIED_FIXTURE':'VERIFIED_PRODUCTION',leafCount:4,outputs};
}
