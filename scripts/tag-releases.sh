#!/usr/bin/env bash
#
# Cria (retroativamente) as tags de versão 0.x nos commits correspondentes e as
# envia para o origin. Idempotente: pula tags que já existem localmente.
#
# Uso, a partir da raiz do repositório com o origin configurado:
#   bash scripts/tag-releases.sh
#
# Mapa versão -> commit também documentado no CHANGELOG.md.
set -euo pipefail

tag() {
  local name="$1" commit="$2" message="$3"
  if git rev-parse -q --verify "refs/tags/${name}" >/dev/null; then
    echo "= ${name} já existe, pulando"
  else
    git tag -a "${name}" "${commit}" -m "${message}"
    echo "+ ${name} -> ${commit}"
  fi
}

tag v0.1.0 69555fa "0.1.0 - Núcleo do clube privado (MVP)"
tag v0.2.0 70bd943 "0.2.0 - Nota/resenha final (Fase 6) e histórico do clube (Fase 7)"
tag v0.3.0 323bd8b "0.3.0 - Primeiro deploy em produção (Vercel)"
tag v0.4.0 8e82fa6 "0.4.0 - Redesign de UX/UI (Fase 8)"
tag v0.5.0 bec9f44 "0.5.0 - Avaliação por capítulo com heatmap (Fase 9)"
tag v0.6.0 cbac26f "0.6.0 - Sorteador do admin e design system"
tag v0.7.0 36d53eb "0.7.0 - Melhorias de UX e ambiente de homologação"
tag v0.7.1 d4d7d57 "0.7.1 - Correção da capa no histórico"
tag v0.7.2 65415b6 "0.7.2 - Correção da foto de perfil"
tag v0.8.0 bc64c8b "0.8.0 - Nota obrigatória na conclusão e exibida no feed"
tag v0.9.0 dfbd9c8 "0.9.0 - Scroll infinito no feed e nos capítulos"
tag v0.10.0 55a7fed "0.10.0 - Redesign visual (tema Biblioteca acolhedora)"

echo "Enviando tags para o origin..."
git push origin --tags
echo "Pronto."
