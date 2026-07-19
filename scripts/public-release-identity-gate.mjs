import {createHash} from 'node:crypto'
import {readFile} from 'node:fs/promises'
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v)
const sha=b=>createHash('sha256').update(b).digest('hex')
const fail=c=>{throw new Error(c)}
const id=JSON.parse(await readFile('public/_mmj/release.json','utf8')),p=JSON.parse(await readFile('generated/public-release.promotion.json','utf8'))
const keys=['schemaVersion','releaseId','promotionSequence','publicCommit','buildAttestationDigest','generatedAt']
if(Object.keys(id).sort().join('|')!==keys.sort().join('|'))fail('MMJ_05N_G_PUBLIC_RELEASE_IDENTITY_MISMATCH')
if(id.releaseId!==p.payload.releaseId||id.promotionSequence!==p.payload.promotionSequence)fail('MMJ_05N_G_PUBLIC_RELEASE_IDENTITY_MISMATCH')
if(process.env.GITHUB_SHA&&id.publicCommit!==process.env.GITHUB_SHA)fail('MMJ_05N_G_PUBLIC_RELEASE_IDENTITY_MISMATCH')
const files=['generated/portfolio.snapshot.json','generated/portfolio.routes.json','generated/public-release.manifest.json','generated/public-release.promotion.json'];const artifactDigests={};for(const f of files)artifactDigests[f]=sha(await readFile(f))
const attestation={schemaVersion:1,owner:'MMJ-05N-F',attestationType:'public-static-build',releaseId:p.payload.releaseId,promotionId:p.promotionId,sourceCommit:id.publicCommit,mediaOrigin:process.env.NUXT_PUBLIC_MMJ_MEDIA_BASE_URL||'https://media.mamajing.work',artifactDigests,providerMutationAuthority:false}
if(id.buildAttestationDigest!=='sha256:'+sha(canonical(attestation)))fail('MMJ_05N_G_PUBLIC_RELEASE_IDENTITY_MISMATCH')
if(id.generatedAt!==p.payload.signedAt)fail('MMJ_05N_G_PUBLIC_RELEASE_IDENTITY_MISMATCH')
if(/bucket|accountId|worker|scriptId|incident|operator|credential|endpoint|controlOrigin|uploadOrigin/i.test(canonical(id)))fail('MMJ_05N_G_PUBLIC_PROVIDER_DETAIL_LEAK')
console.log(JSON.stringify({gate:'PASS_MMJ_05N_G_PUBLIC_RELEASE_IDENTITY',releaseId:id.releaseId,promotionSequence:id.promotionSequence,publicCommit:id.publicCommit,buildAttestationDigest:id.buildAttestationDigest},null,2))
