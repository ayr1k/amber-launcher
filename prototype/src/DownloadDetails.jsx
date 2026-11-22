// SPDX-License-Identifier: MPL-2.0
import {t as label} from '../desktop/localization.mjs';

function rate(value) {
  if (!Number.isFinite(value)) return label('未知');
  if (value < 1024) return Math.round(value) + ' B/s';
  if (value < 1048576) return (value / 1024).toFixed(1) + ' KiB/s';
  return (value / 1048576).toFixed(2) + ' MiB/s';
}

function SpeedHistory({samples}) {
  if (!samples.some(Number.isFinite)) return <p>{label('尚无传输采样')}</p>;
  const peak = Math.max(...samples.filter(Number.isFinite));
  const y = value => 45 - 40 * value / (peak || 1);
  let path = '', connected = false;
  samples.forEach((value, index) => {
    if (Number.isFinite(value)) {
      const x = 2 + (60 - samples.length + index) * 5;
      path += (connected ? 'L' : 'M') + x + ' ' + y(value) + 'h0.2 ';
    }
    connected = Number.isFinite(value);
  });
  return <figure className="task-speed-history">
    <svg viewBox="0 0 300 48" preserveAspectRatio="none" aria-hidden="true">
      <path d="M2 45H298" stroke="currentColor" opacity=".25"/>
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
    </svg>
    <figcaption>{label('最近 60 秒 · 每秒采样 · 峰值 {0}', {0:rate(peak)})}</figcaption>
  </figure>;
}

export function DownloadDetails({job, selected, onSelect}) {
  const open = selected === job.id;
  const data = job.downloadDiagnostics, config = data?.config, unknown = label('未知');
  const mode = {auto:label('自动选择'),official:label('官方源'),mainland:'BMCLAPI'};
  const route = v => v==='official' ? label('官方源') : v==='mirror' ? 'BMCLAPI' : label(v);
  const modes = data?.modes.map(n=>n===1 ? label('单流') : label('{0} 段',{0:n})).join(' / ');
  return <details className="task-download-details" open={open}>
    <summary onClick={e=>{e.preventDefault();onSelect(open ? null : job.id);}}>{label('下载诊断')}</summary>
    {open && <>
      <p><strong>{label('当前速度')} · {rate(job.state !== 'running' || job.networkPaused ? 0 : data?.speed)}</strong></p>
      <SpeedHistory samples={data?.history || []}/>
      <h4>{label('配置（最近开始的文件）')}</h4>
      <dl>{[
        ['多文件并发上限', config?.fileLimit], ['共享连接上限', config?.sharedLimit],
        ['单文件策略', config && (config.segments ? label('符合条件时最多 4 段') : label('单流'))],
        ['共享限速', config && (config.bandwidthKib ? config.bandwidthKib+' KiB/s' : label('不限速'))],
        ['来源策略', mode[config?.sourceMode]]
      ].map(([key,value])=><div key={key}><dt>{label(key)}</dt><dd>{value ?? unknown}</dd></div>)}</dl>
      <h4>{label('实际传输（本任务）')}</h4>
      <dl>{[
        ['并发文件（当前 / 峰值）', data && data.files+' / '+data.peakFiles],
        ['已观察到的单文件模式', modes || unknown],
        ['单文件同时传输流峰值', data?.peakStreams || unknown],
        ['最近传输生效限速', data?.appliedKib == null ? unknown : data.appliedKib ? data.appliedKib+' KiB/s' : label('不限速')],
        ['最近响应来源', data?.sources.join(' · ') || unknown],
        ['最近回退', data?.lastFallback?.map(route).join(' → ') || unknown],
        ['传输重试 / 回退次数', data && data.retries+' / '+data.fallbacks],
        ['已复用部分文件', data && (data.resumed ? label('是') : label('未观察到'))]
      ].map(([key,value])=><div key={key}><dt>{label(key)}</dt><dd>{value ?? unknown}</dd></div>)}</dl>
    </>}
  </details>;
}
