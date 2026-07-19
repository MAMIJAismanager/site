import {rm} from 'node:fs/promises'
await rm('.build',{recursive:true,force:true})
console.log('PASS_MMJ_PUBLIC_RUNTIME_ARTIFACT_CLEAN')
