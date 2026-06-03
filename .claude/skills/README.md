## ONBOARDING DE NUEVO CLIENTE (DEC-017)

1. GitHub "Use this template" desde hwe-template → crea `site-{slug}`
2. git clone --recurse-submodules site-{slug}
   → Clona repo con .hwe-tools/ submodule ya montado

3. /import-figma https://github.com/... {slug}
   → Genera docs/figma-analysis.md + docs/design-language.md + docs/tokens.json

4. /scaffold-site {slug}
   → Configura src/blocks/registry.ts, tailwind, tokens, client.config.ts

5. npm install
   → Instala @hwe/core-ui + @hwe/config desde npm privado

6. /scaffold-block FAQBlock --target base
   → (en hwe-core) Crea base-block + schema en core-ui

7. /scaffold-block FAQBlock --target client --site {slug}
   → Crea re-export en src/blocks/ + actualiza registry

8. /add-block FAQBlock --page home
   → Añade a HomeComposition con fake content

9. /design-block FAQBlock --client {slug}
   → Genera visual spec desde docs/design-language.md

10. npm run typecheck && npm test && npm run build
    → Todo verde