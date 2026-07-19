import {verifyFixtureRetirement} from './public-05n-n-core.mjs';console.log(JSON.stringify(await verifyFixtureRetirement({allowFixture:process.argv.includes('--allow-fixture')}),null,2));
