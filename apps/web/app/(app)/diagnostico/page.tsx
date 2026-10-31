
import { DiagnosticWizard } from "./wizard"

export default function DiagnosticoPage() {
  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 p-6">
        <DiagnosticWizard />
      </main>
    </div>
  )
}
