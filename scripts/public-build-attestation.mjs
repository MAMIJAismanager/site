import {createHash} from 'node:crypto'
import {readFile,mkdir,writeFile} from 'node:fs/promises'
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v)
const sha=b=>createHash('sha256').update(b).digest('hex')
const files=['generated/portfolio.snapshot.json','generated/portfolio.routes.json','generated/public-release.manifest.json','generated/public-release.promotion.json']
const artifactDigests={};for(const f of files)artifactDigests[f]=sha(await readFile(f))
const promotion=JSON.parse(await readFile('generated/public-release.promotion.json','utf8'))
const identity=JSON.parse(await readFile('public/_mmj/release.json','utf8'))
const sourceCommit=process.env.GITHUB_SHA||identity.publicCommit||'ROOT_COMMIT'
const attestation={schemaVersion:1,owner:'MMJ-05N-F',attestationType:'public-static-build',releaseId:promotion.payload.releaseId,promotionId:promotion.promotionId,sourceCommit,mediaOrigin:process.env.NUXT_PUBLIC_MMJ_MEDIA_BASE_URL||'https://media.mamajing.work',artifactDigests,providerMutationAuthority:false}
const buildAttestationDigest='sha256:'+sha(canonical(attestation))
const materializedIdentity={schemaVersion:1,releaseId:promotion.payload.releaseId,promotionSequence:promotion.payload.promotionSequence,publicCommit:sourceCommit,buildAttestationDigest,generatedAt:promotion.payload.signedAt}
await mkdir('.build/mmj-05n-f',{recursive:true})
await writeFile('.build/mmj-05n-f/public-build-attestation.json',JSON.stringify({...attestation,buildAttestationDigest},null,2)+'\n')
await writeFile('public/_mmj/release.json',JSON.stringify(materializedIdentity,null,2)+'\n')
console.log(JSON.stringify({...attestation,buildAttestationDigest},null,2))
