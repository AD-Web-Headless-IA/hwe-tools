## IMPORTAR UN PROYECTO Y CREAR REPO 
1. /import-figma https://github.com/agenciawebsqs/Skillskittest base-template
   → Genera figma-analysis.md + design-language.md (NEW)

2. /scaffold-site site-demo
   → Crea apps/site-demo/ completo con re-exports de base-blocks + registry

3. pnpm install && pnpm build
   → Valida que el site scaffoldeado compila

4. /scaffold-block FAQBlock --target base
   → Crea base-block + schema en core-ui

5. /scaffold-block FAQBlock --target client --site site-demo
   → Crea re-export en site-demo + actualiza registry

6. /add-block FAQBlock --site site-demo --page home
   → Añade a HomeComposition con fake content

7. /design-block FAQBlock --client base-template
   → Genera visual spec desde design-language.md

8. pnpm typecheck && pnpm test && pnpm build
   → Todo verde