// KaTeX 公式渲染封装（错误容错）
import katex from "katex";
import { memo, useMemo } from "react";

function MathFormula({ tex, block = false }: { tex: string; block?: boolean }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, {
        throwOnError: false,
        displayMode: block,
        strict: false,
      });
    } catch {
      return "<span class=\"katex-error\">公式解析失败</span>";
    }
  }, [tex, block]);

  return (
    <span
      className={"math-tex" + (block ? " math-tex-block" : "")}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default memo(MathFormula);