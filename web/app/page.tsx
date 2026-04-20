import { App } from "@/components/App";
import { loadShowData } from "@/lib/data";

export default function Page() {
  const data = loadShowData();
  return <App data={data} />;
}
