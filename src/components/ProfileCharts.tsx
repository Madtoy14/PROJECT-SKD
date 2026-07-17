/**
 * ProfileCharts — lazy-loaded to split chart.js (~630KB) from main bundle.
 * ponytail: pass ChartData types when chart.js types imported here; for now `object` is enough.
 */
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  Title,
} from 'chart.js';
import { Radar, Line } from 'react-chartjs-2';

ChartJS.register(
  RadialLinearScale, PointElement, LineElement, Filler,
  Tooltip, Legend, CategoryScale, LinearScale, Title
);

interface Props {
  radarData: object;
  radarOptions: object;
  lineData: object;
  lineOptions: object;
}

export default function ProfileCharts({ radarData, radarOptions, lineData, lineOptions }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div className="bg-surface shadow-sm border border-border rounded-2xl p-4 flex flex-col">
        <h4 className="text-sm font-black tracking-wider text-[#F3A04C] uppercase mb-4 text-center">SKD Balance AI</h4>
        <div className="w-full flex-1 min-h-[220px] flex justify-center items-center">
          <Radar data={radarData as any} options={radarOptions as any} />
        </div>
      </div>
      <div className="bg-surface shadow-sm border border-border rounded-2xl p-4 flex flex-col">
        <h4 className="text-sm font-black tracking-wider text-[#40B43E] uppercase mb-4 text-center">Trend Skor (7 Hari)</h4>
        <div className="w-full flex-1 min-h-[220px] flex justify-center items-center">
          <Line data={lineData as any} options={lineOptions as any} />
        </div>
      </div>
    </div>
  );
}
