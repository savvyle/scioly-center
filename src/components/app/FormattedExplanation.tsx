import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/contrib/mhchem";

export function FormattedExplanation({ text }: { text: string }) {
  return <div className="formatted-explanation min-w-0 text-sm leading-relaxed">
    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[[rehypeKatex, { trust: false, strict: false }]]} skipHtml>{text}</ReactMarkdown>
  </div>;
}