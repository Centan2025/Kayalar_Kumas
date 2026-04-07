import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, Plus, Minus } from 'lucide-react';

type Props = {
    id: string;
    label: string;
    subLabel?: string;
    parts?: number;
    onClose: () => void;
};

export default function QRPrintModal({ id, label, subLabel, parts = 1, onClose }: Props) {
    const printAreaRef = useRef<HTMLDivElement>(null);
    const [copies, setCopies] = useState(parts);

    const handlePrint = () => {
        if (!printAreaRef.current) return;
        const printContent = printAreaRef.current.innerHTML;
        const win = window.open('', '_blank', 'width=400,height=500');
        if (!win) return;
        win.document.write(`
      <html><head><title>QR Etiket — ${id}</title>
      <style>
        body { margin:0; padding:0; font-family:Arial,sans-serif; }
        .print-container { display: flex; flex-direction: column; gap: 20px; align-items: center; padding: 20px; }
        .label { border:2px dashed #ccc; padding:20px; text-align:center; width:280px; page-break-inside: avoid; }
        .label h2 { margin:0 0 4px 0; font-size:14px; }
        .label p { margin:0; font-size:11px; color:#666; }
        .label svg { margin:16px 0; }
        .label .id { font-size:16px; font-weight:bold; letter-spacing:1px; margin-top:8px; }
        .label .part-info { font-size: 12px; font-weight: bold; margin-top: 4px; color: #333; }
        @media print { 
            body { padding:0; } 
            .print-container { padding: 0; gap: 0; }
            .label { border:2px solid #000; margin-bottom: 10px; page-break-after: always; } 
            .label:last-child { page-break-after: auto; }
        }
      </style></head><body>
      <div class="print-container">${printContent}</div>
      <script>window.onload=function(){window.print();window.close();}</script>
      </body></html>
    `);
        win.document.close();
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem'
        }}>
            <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '360px', textAlign: 'center', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>QR Etiket</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Kopya Sayısı:</span>
                    <button onClick={() => setCopies(Math.max(1, copies - 1))} className="button button-outline" style={{ padding: '0.25rem 0.5rem' }}><Minus size={16} /></button>
                    <span style={{ fontWeight: 'bold', width: '30px', textAlign: 'center' }}>{copies}</span>
                    <button onClick={() => setCopies(copies + 1)} className="button button-outline" style={{ padding: '0.25rem 0.5rem' }}><Plus size={16} /></button>
                </div>

                {/* Print area */}
                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', border: '2px dashed var(--border-color)', borderRadius: '12px', padding: '1rem', backgroundColor: '#fff', color: '#000' }}>
                    <div ref={printAreaRef} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                        {Array.from({ length: copies }).map((_, i) => (
                            <div key={i} className="label" style={{ padding: '1.5rem', border: '2px solid #ccc', borderRadius: '8px', width: '280px', textAlign: 'center' }}>
                                <h2 style={{ margin: '0 0 4px 0', fontSize: '0.9rem' }}>Kayalar Kumaş</h2>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>{label}</p>
                                <div style={{ margin: '1rem 0', display: 'flex', justifyContent: 'center' }}>
                                    <QRCodeSVG value={id} size={150} level="H" includeMargin />
                                </div>
                                <div className="id" style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '1px' }}>{id}</div>
                                {subLabel && <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>{subLabel}</p>}
                                <div className="part-info" style={{ marginTop: '0.5rem', fontSize: '0.8rem', fontWeight: 'bold' }}>Parça: {i + 1} / {copies}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <button onClick={handlePrint} className="button w-full" style={{ gap: '0.5rem' }}>
                    <Printer size={20} /> Etiketleri Yazdır ({copies} Adet)
                </button>
            </div>
        </div>
    );
}
