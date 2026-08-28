export function AboutPanel({ labels }: { labels: Record<string, string> }) {
  return (
    <section className="grid min-w-0 gap-4 lg:grid-cols-2">
      <article className="min-w-0 rounded-lg border border-[#d7dfd6] bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-semibold">{labels.aboutTitle}</h2>
        <p className="mt-3 text-sm leading-7 text-[#5f625b]">{labels.aboutBody}</p>
      </article>
      <article className="min-w-0 rounded-lg border border-[#d7dfd6] bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-semibold">{labels.skillTitle}</h2>
        <p className="mt-3 text-sm leading-7 text-[#5f625b]">{labels.skillBody}</p>
        <p className="mt-3 border-t border-[#e2ddd3] pt-3 text-sm leading-7 text-[#5f625b]">{labels.generatorSkillBody}</p>
      </article>
      <article className="min-w-0 rounded-lg border border-[#d7dfd6] bg-white p-5 shadow-sm lg:col-span-2">
        <h2 className="text-2xl font-semibold">{labels.mcpTitle}</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {[labels.mcpBody, labels.mcpAuth, labels.mcpTools].map((text) => <p key={text} className="rounded-md bg-[#f5f7f3] p-3 text-sm leading-6 text-[#4f5b55]">{text}</p>)}
        </div>
        <CodexMcpGuide labels={labels} />
      </article>
      <article className="min-w-0 rounded-lg border border-[#d7dfd6] bg-white p-5 shadow-sm lg:col-span-2">
        <h2 className="text-2xl font-semibold">{labels.workflowTitle}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[labels.workflowCapture, labels.workflowGenerate, labels.workflowPractice, labels.workflowExport].map((step) => <p key={step} className="rounded-md bg-[#f5f7f3] p-3 text-sm leading-6 text-[#4f5b55]">{step}</p>)}
        </div>
      </article>
      <article className="min-w-0 rounded-lg border border-[#d7dfd6] bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-semibold">{labels.deployTitle}</h2>
        <p className="mt-3 text-sm leading-7 text-[#5f625b]">{labels.deployBody}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a className="rounded-md bg-[#173d35] px-4 py-2 text-sm font-semibold text-white" href="https://github.com/erzhiqianyi/jlpt-master-deck" target="_blank" rel="noreferrer">GitHub</a>
          <a className="rounded-md border border-[#cbd6cf] bg-white px-4 py-2 text-sm font-semibold text-[#24473f]" href="https://github.com/erzhiqianyi/jlpt-master-deck/blob/main/README.md" target="_blank" rel="noreferrer">README</a>
        </div>
      </article>
    </section>
  );
}

function CodexMcpGuide({ labels }: { labels: Record<string, string> }) {
  const flow = [
    { title: labels.mcpFlowApp, body: labels.mcpFlowAppBody },
    { title: labels.mcpFlowBackend, body: labels.mcpFlowBackendBody },
    { title: labels.mcpFlowMcp, body: labels.mcpFlowMcpBody },
    { title: labels.mcpFlowCodex, body: labels.mcpFlowCodexBody },
  ];
  const steps = [labels.mcpStepOne, labels.mcpStepTwo, labels.mcpStepThree, labels.mcpStepFour, labels.mcpStepFive];
  const implementation = [labels.mcpImplementationServer, labels.mcpImplementationStorage, labels.mcpImplementationAuth, labels.mcpImplementationDraft];
  const config = [
    '[mcp_servers.jlpt_review]',
    'command = "node"',
    'args = ["server/mcp-server.mjs"]',
    'cwd = "/Users/itsuki/Documents/ChatGPT/JLPT-local-backend-auth-mcp"',
    'startup_timeout_sec = 20',
    'tool_timeout_sec = 60',
  ].join('\n');

  return (
    <div className="mt-5 border-t border-[#e2ddd3] pt-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="min-w-0">
          <p className="text-sm font-semibold text-[#856033]">{labels.mcpCodexGuideTitle}</p>
          <p className="mt-2 text-sm leading-7 text-[#5f625b]">{labels.mcpCodexGuideBody}</p>
          <h3 className="mt-5 text-base font-semibold">{labels.mcpFlowTitle}</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            {flow.map((item, index) => (
              <div key={item.title} className="relative min-w-0 rounded-md border border-[#d7dfd6] bg-[#f5f7f3] p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#173d35] text-sm font-semibold text-white">{index + 1}</div>
                <h4 className="mt-3 text-sm font-semibold">{item.title}</h4>
                <p className="mt-2 text-xs leading-5 text-[#5f625b]">{item.body}</p>
                {index < flow.length - 1 ? <span className="pointer-events-none absolute -right-3 top-6 hidden h-6 w-6 items-center justify-center rounded-full border border-[#cbd6cf] bg-white text-[#24473f] md:flex">→</span> : null}
              </div>
            ))}
          </div>
          <h3 className="mt-5 text-base font-semibold">{labels.mcpSetupTitle}</h3>
          <div className="mt-3 grid gap-2">{steps.map((step) => <p key={step} className="rounded-md bg-[#fffaf4] p-3 text-sm leading-6 text-[#4f5b55]">{step}</p>)}</div>
          <h3 className="mt-5 text-base font-semibold">{labels.mcpImplementationTitle}</h3>
          <div className="mt-3 grid gap-2">{implementation.map((item) => <p key={item} className="rounded-md bg-[#f8faf5] p-3 text-sm leading-6 text-[#4f5b55]">{item}</p>)}</div>
        </section>
        <aside className="min-w-0 rounded-md border border-[#d8cdbc] bg-[#fffaf4] p-4">
          <h3 className="text-base font-semibold">{labels.mcpConfigTitle}</h3>
          <pre className="mt-3 overflow-x-auto rounded-md bg-[#1f2522] p-4 text-xs leading-5 text-[#f5f7f3]">{config}</pre>
          <h3 className="mt-5 text-base font-semibold">{labels.mcpPromptTitle}</h3>
          <p className="mt-3 rounded-md bg-white p-3 text-sm leading-6 text-[#4f5b55]">{labels.mcpPromptExample}</p>
        </aside>
      </div>
    </div>
  );
}
