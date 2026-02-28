import MyServices from "@/features/services/pages/MyServices";
import MySchedules from "@/features/schedules/pages/MySchedules";
export default function ServiceAndSchedules() {
  return (
    <div>
      <MyServices />

      {/* horarios */}
      <MySchedules />
    </div>
  );
}
