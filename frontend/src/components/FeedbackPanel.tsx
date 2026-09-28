import type { Feedback } from "../api";

interface FeedbackPanelProps {
  feedback: Feedback;
  candidateName: string;
  onRestart: () => void;
}

function Section({
  title,
  items,
  colorClass,
  icon,
}: {
  title: string;
  items: string[];
  colorClass: string;
  icon: React.ReactNode;
}) {
  if (!items || !items.length) return null;
  return (
    <div className="h-full">
      <div className={"flex items-center gap-2 mb-3 " + colorClass}>
        {icon}
        <h3 className="font-medium text-sm uppercase tracking-wide">{title}</h3>
      </div>
      <ul className="space-y-2">
        {items.filter(Boolean).map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-[#3c4043] leading-relaxed">
            <span className={"mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 " + colorClass.replace("text-", "bg-")} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function FeedbackPanel({
  feedback,
  candidateName,
  onRestart,
}: FeedbackPanelProps) {
  const answeredCount = feedback.questions_answered ?? 0;
  const totalCount = feedback.total_questions ?? 10;
  const score = feedback.score ?? 0;
  const percentComplete = Math.min(100, Math.round((answeredCount / Math.max(totalCount, 1)) * 100));

  const strongItems = feedback.strong_sections?.length ? feedback.strong_sections : (feedback.strengths || []);
  const weakItems = feedback.weak_sections?.length ? feedback.weak_sections : (feedback.gaps || []);
  const improveItems = feedback.areas_to_improve?.length ? feedback.areas_to_improve : (feedback.next || []);

  const handleDownloadPDF = () => {
    var printWindow = window.open("", "_blank");
    if (!printWindow) return;

    var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Interview Report</title><style>';
    html += 'body{font-family:Roboto,Arial,sans-serif;padding:40px;color:#1f1f1f;background:#fff}';
    html += '.header{text-align:center;border-bottom:2px solid #1a73e8;padding-bottom:20px;margin-bottom:30px}';
    html += '.header h1{font-size:28px;font-weight:500;margin:0 0 8px}';
    html += '.header p{color:#5f6368;font-size:14px;margin:0}';
    html += '.stats{display:flex;gap:16px;margin-bottom:30px}';
    html += '.stat{flex:1;background:#f8f9fa;border-radius:12px;padding:20px;text-align:center}';
    html += '.stat .label{font-size:11px;text-transform:uppercase;color:#5f6368;margin-bottom:8px}';
    html += '.stat .value{font-size:28px;font-weight:500}';
    html += '.stat .sub{font-size:11px;color:#9aa0a6;margin-top:4px}';
    html += '.summary{background:#f8f9fa;border-left:4px solid #1a73e8;border-radius:8px;padding:16px 20px;margin-bottom:24px}';
    html += '.summary p{font-size:14px;color:#3c4043;line-height:1.7;margin:0}';
    html += '.section{margin-bottom:24px}';
    html += '.section-title{font-size:14px;font-weight:500;text-transform:uppercase;margin-bottom:12px}';
    html += '.section ul{list-style:none;padding:0;margin:0}';
    html += '.section li{padding:6px 0 6px 20px;position:relative;font-size:14px;color:#3c4043;line-height:1.6}';
    html += '.section li::before{content:"";position:absolute;left:0;top:12px;width:6px;height:6px;border-radius:50%}';
    html += '.green .section-title{color:#188038}.green li::before{background:#188038}';
    html += '.red .section-title{color:#d93025}.red li::before{background:#d93025}';
    html += '.blue .section-title{color:#1a73e8}.blue li::before{background:#1a73e8}';
    html += '.footer{text-align:center;margin-top:40px;padding-top:20px;border-top:1px solid #e8eaed;color:#9aa0a6;font-size:12px}';
    html += '@media print{body{padding:20px}}';
    html += '</style></head><body>';

    html += '<div class="header"><h1>Interview Report</h1><p>' + candidateName + ' &middot; ' + new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) + '</p></div>';

    html += '<div class="stats">';
    html += '<div class="stat"><div class="label">Questions Answered</div><div class="value" style="color:#1a73e8">' + answeredCount + ' / ' + totalCount + '</div><div class="sub">' + percentComplete + '% completed</div></div>';
    html += '<div class="stat"><div class="label">Completion Rate</div><div class="value" style="color:#1a73e8">' + percentComplete + '%</div><div class="sub">Interview coverage</div></div>';
    html += '<div class="stat"><div class="label">Performance Score</div><div class="value" style="color:' + (score >= 75 ? "#188038" : score >= 50 ? "#f9ab00" : "#d93025") + '">' + score + '%</div><div class="sub">' + (score >= 75 ? "Strong" : score >= 50 ? "Adequate" : "Needs Practice") + '</div></div>';
    html += '</div>';

    html += '<div class="summary"><p>' + (feedback.summary || "No summary available.") + '</p></div>';

    html += '<div class="section green"><div class="section-title">Demonstrated Strengths</div><ul>';
    strongItems.filter(Boolean).forEach(function(item) { html += '<li>' + item + '</li>'; });
    html += '</ul></div>';

    html += '<div class="section red"><div class="section-title">Gaps & Weak Areas</div><ul>';
    weakItems.filter(Boolean).forEach(function(item) { html += '<li>' + item + '</li>'; });
    html += '</ul></div>';

    html += '<div class="section blue"><div class="section-title">Actionable Areas to Improve</div><ul>';
    improveItems.filter(Boolean).forEach(function(item) { html += '<li>' + item + '</li>'; });
    html += '</ul></div>';

    html += '<div class="footer">Generated by MAESTER AI Interview Agent &middot; ' + new Date().toLocaleString() + '</div>';

    html += '</body></html>';

    if (printWindow) {
      var win = printWindow;
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(function() { win.print(); }, 500);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-10 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#ceead6] mb-4">
          <svg className="w-8 h-8 text-[#188038]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-normal text-[#1f1f1f] mb-1">Interview Complete</h2>
        <p className="text-[#5f6368] text-sm">Here's your personalised evaluation report, {candidateName.split(" ")[0]}</p>
      </div>

      {/* Action Buttons - at top of feedback page */}
      <div className="flex flex-col sm:flex-row gap-3 pb-4 border-b border-[#e8eaed]">
        <button
          onClick={onRestart}
          className="flex-1 py-3 rounded-full bg-[#1a73e8] text-white text-sm font-medium hover:bg-[#1765cc] transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Take Next Interview
        </button>
        <button
          onClick={handleDownloadPDF}
          className="flex-1 py-3 rounded-full border border-[#dadce0] text-[#1a73e8] text-sm font-medium hover:bg-[#f8f9fa] transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Report
        </button>
        <button
          onClick={onRestart}
          className="flex-1 py-3 rounded-full border border-[#dadce0] text-[#5f6368] text-sm font-medium hover:bg-[#f8f9fa] transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Back to Home
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[#e8eaed] p-5 flex flex-col items-center justify-center text-center">
          <span className="text-xs uppercase tracking-wide text-[#5f6368] mb-1 font-medium">Questions Answered</span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-medium text-[#1a73e8]">{answeredCount}</span>
            <span className="text-sm text-[#5f6368]">/ {totalCount}</span>
          </div>
          <div className="w-full bg-[#e8eaed] rounded-full h-1.5 mt-3 overflow-hidden">
            <div className="bg-[#1a73e8] h-1.5 rounded-full transition-all duration-700 ease-out" style={{ width: percentComplete + "%" }} />
          </div>
          <span className="text-[11px] text-[#5f6368] mt-2">{percentComplete}% of questions completed</span>
        </div>

        <div className="bg-white rounded-2xl border border-[#e8eaed] p-5 flex flex-col items-center justify-center text-center">
          <span className="text-xs uppercase tracking-wide text-[#5f6368] mb-1 font-medium">Completion Rate</span>
          <span className="text-3xl font-medium text-[#1a73e8]">{percentComplete}%</span>
          <div className="w-full bg-[#e8eaed] rounded-full h-1.5 mt-3 overflow-hidden">
            <div className="bg-[#1a73e8] h-1.5 rounded-full transition-all duration-700 ease-out" style={{ width: percentComplete + "%" }} />
          </div>
          <span className="text-[11px] text-[#5f6368] mt-2">Interview coverage</span>
        </div>

        <div className="bg-white rounded-2xl border border-[#e8eaed] p-5 flex flex-col items-center justify-center text-center">
          <span className="text-xs uppercase tracking-wide text-[#5f6368] mb-1 font-medium">Performance Score</span>
          <span className={"text-3xl font-medium " + (score >= 75 ? "text-[#188038]" : score >= 50 ? "text-[#f9ab00]" : "text-[#d93025]")}>
            {score}%
          </span>
          <div className="w-full bg-[#e8eaed] rounded-full h-1.5 mt-3 overflow-hidden">
            <div className={"h-1.5 rounded-full transition-all duration-700 ease-out " + (score >= 75 ? "bg-[#188038]" : score >= 50 ? "bg-[#f9ab00]" : "bg-[#d93025]")} style={{ width: score + "%" }} />
          </div>
          <span className="text-[11px] text-[#5f6368] mt-2">
            {score >= 75 ? "Strong Performance" : score >= 50 ? "Adequate Performance" : answeredCount === 0 ? "Not Assessed" : "Needs Practice"}
          </span>
        </div>
      </div>

      {/* AI Summary */}
      <div className="bg-white rounded-2xl border border-[#e8eaed] p-5 border-l-4 border-l-[#1a73e8]">
        <h4 className="text-xs uppercase tracking-wide text-[#1a73e8] font-medium mb-2 flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Overall Assessment
        </h4>
        <p className="text-[#3c4043] text-sm leading-relaxed">{feedback.summary || "No summary available."}</p>
      </div>

      {/* Strengths & Weaknesses Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-4">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#e8eaed] p-5 flex flex-col h-full border-t-2 border-t-[#188038]">
            <Section
              title="Demonstrated Strengths"
              items={strongItems}
              colorClass="text-[#188038]"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              }
            />
          </div>

          <div className="bg-white rounded-2xl border border-[#e8eaed] p-5 flex flex-col h-full border-t-2 border-t-[#d93025]">
            <Section
              title="Gaps & Weak Areas"
              items={weakItems}
              colorClass="text-[#d93025]"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#e8eaed] p-5 border-t-2 border-t-[#1a73e8] h-full">
          <Section
            title="Actionable Areas to Improve"
            items={improveItems}
            colorClass="text-[#1a73e8]"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
        </div>
      </div>

    </div>
  );
}
