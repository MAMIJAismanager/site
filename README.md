# MMJ Site

`매미: 著` 공개 포트폴리오 렌더러입니다.

이 저장소는 **Public Site 전용**이며 Google Sheets, Apps Script, CMS Worker, R2 업로드·삭제 권위, 마이그레이션 및 감사 코드를 소유하지 않습니다.

## 신뢰 경계

```text
Private Control Plane
  -> 승인된 Public Release Bundle
  -> 이 저장소
  -> Nuxt 정적 배포
```

공개 저장소가 소비하는 데이터는 다음 세 파일로 제한됩니다.

```text
generated/portfolio.snapshot.json
generated/portfolio.routes.json
generated/public-release.manifest.json
```

## 실행

```bash
npm ci
npm run gate:mmj-05n-b
npm run dev
```

## 허용 환경변수

```text
NUXT_PUBLIC_MMJ_MEDIA_BASE_URL
MMJ_BUILD_ENVIRONMENT_CLASS
```

Google, Apps Script, Cloudflare Worker, R2 write credential 및 CMS 제어면 환경변수는 이 저장소에서 금지됩니다.


## MMJ-05N-B Public Release Consumer

This repository does not produce portfolio data. It accepts only the three canonical MMJ-05N-B release files under `generated/` and verifies exact keys, canonical bytes, digests, route derivation, reachability closure, and raw control-plane exclusion.

```bash
npm run verify:public-schema
npm run verify:public-release
npm run gate:mmj-05n-b
```

## 공개 도메인 계약

공개 렌더러는 `public-asset-domain.ts`와 `public-project-link-domain.ts`만 소비합니다. 게시 상태, 승인 상태, CMS revision 및 운영 감사 타입은 공개 패키지에 포함되지 않습니다.

## Signed public releases

`generated/public-release.promotion.json` binds the exact 05N-B release bytes to an Ed25519 signature, target repository, target branch, sequence and predecessor chain. Public CI verifies the signature without any secret.

```bash
npm run verify:public-promotion-signature
npm run verify:public-promotion-chain
npm run verify:public-promotion-diff
npm run gate:mmj-05n-c
```

The bundled sequence-1 signature uses a bake-only bootstrap key whose public key is retired after sequence 1. No matching private key is included. Before a later promotion, add a production public key through a separate trust-root PR and sign from the private control plane.

## Runtime boundary

Production builds accept only `NUXT_PUBLIC_MMJ_MEDIA_BASE_URL=https://media.mamajing.work`. CMS control and upload origins are private control-plane configuration and are forbidden in this repository.

## MMJ-05N-E public history baseline

This package starts a clean public Git history. The baseline is bound to the single root commit tree, excluding the baseline file itself. Run `npm run gate:mmj-05n-e` on every push and pull request.

## MMJ-05N-F

This repository only verifies the signed Release contract and emits a static build attestation. It contains no provider mutation adapter. Production deployment authority remains in the Private Control Plane.

## MMJ-05N-G public release identity

The public repository exposes only `public/_mmj/release.json`. It contains the signed release identity and build-attestation digest, and owns no provider observer, incident controller, or recovery mutation authority.

## MMJ-05N-H restore provenance

The public repository exposes no backup provider, checkpoint locator, storage tier, vault reference, or recovery contact. A restored build records checkpoint and restore receipt digests only in a private CI receipt under `.build/`, never in the deployed public surface.

## MMJ-05N-I

This repository verifies only the minimal signed continuity publication-readiness claim. It does not contain storage inventory, scrub evidence, RPO/RTO details or signing private keys.

## MMJ-05N-J
The Public repository verifies `generated/publication-authorization.claim.json` using `trust/governance-authorization-keys.json`. It contains no operator identity or mutation authority.

## MMJ-05N-K public build contract

The public repository uses a portable npm lockfile, exact Node/npm versions, commit-pinned GitHub Actions, a public dependency graph and SBOM, and signed fixture build provenance. Production verification rejects fixture provenance and requires an externally issued production build-provenance key and exact deployed artifact parity.

## MMJ-05N-M Unified Release Admission

A~L leaf evidence is joined by a typed claim graph, trust epoch, append-only transparency log, and one-time composite admission passport. Fixture evidence remains blocked from production.
