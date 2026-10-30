---
name: lumetric-audit
description: Automated pre-flight security, build verification, and 32-endpoint cloud health audit for Lumetric.
---

# Lumetric Automated Audit Playbook

Use this skill whenever verifying stability, preparing releases, or performing pre-flight checks before pushing to `origin/main`.

## Verification Workflow

### Step 1: Type Safety Verification
Run the TypeScript compiler with no emit to catch interface mismatches, missing props, or invalid type assertions:
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
cd lumetric
npx tsc --noEmit
```

### Step 2: Next.js Production Build & Asset Postbuild
Compile the production static distribution and trigger `postbuild.js` for dual-platform asset reconciliation:
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
cd lumetric
npm run build
```

### Step 3: Capacitor Mobile Sync
Mirror compiled web assets into Android and iOS native mobile shells:
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
cd lumetric
npx cap sync
```

### Step 4: Zoho Catalyst Serverless Cloud Deployment
Deploy updated serverless functions and web hosting client:
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
catalyst deploy
```

### Step 5: 32-Endpoint 200 OK Cloud Audit
Execute the automated live audit script against the production Catalyst gateway:
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
node lumetric/scripts/audit_live.js
```
Must pass with 100% (32/32 Endpoints PASS 200 OK).
