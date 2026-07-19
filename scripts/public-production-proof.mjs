import { spawnSync } from 'node:child_process'
const env={...process.env,MMJ_BUILD_ENVIRONMENT_CLASS:'production',NUXT_PUBLIC_MMJ_MEDIA_BASE_URL:'https://media.mamajing.work'}
const cli='./node_modules/nuxt/bin/nuxt.mjs'
for(const command of ['typecheck','generate']){const r=spawnSync(process.execPath,[cli,command],{stdio:'inherit',env});if(r.status!==0)process.exit(r.status??1)}
console.log(JSON.stringify({event:'PASS_MMJ_05N_D_PUBLIC_PRODUCTION_PROOF'}))
