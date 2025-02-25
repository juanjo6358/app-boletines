import { BackButton } from './BackButton';
import { ReportCardDesigner } from './report-cards/ReportCardDesigner';

export function ReportCards() {
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <BackButton />
        </div>
        <ReportCardDesigner />
      </div>
    </div>
  );
}