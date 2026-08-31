import React, { useCallback, useState } from 'react';
import { Camera, FileImage, ImageUp, RefreshCw, ScanLine, ShieldCheck } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Button, InlineAlert, PageHeader, cn } from '../components/ui';

export default function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectFile = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setError('');
  }, []);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) selectFile(accepted[0]);
  }, [selectFile]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    onDropRejected: () => setError('Choose one JPG or PNG image to continue.'),
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
    maxFiles: 1,
    multiple: false,
    noClick: Boolean(preview),
  });

  const clearSelection = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setError('');
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await api.post('/api/predict/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      navigate('/results', { state: { results: data, imagePreview: preview } });
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Meal analysis"
        title="Upload a meal photo"
        description="Use one clear, well-lit image with the full plate visible. You will review every estimate before saving."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <section aria-label="Meal photo upload" className="rounded-2xl border border-line bg-surface p-4 dark:border-night-line dark:bg-night-surface sm:p-5">
          <div
            {...getRootProps({
              'aria-label': preview ? 'Selected meal photo' : 'Upload a meal photo',
            })}
            className={cn(
              'relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-xl border-2 border-dashed p-6 text-center transition-colors sm:min-h-[480px]',
              !preview && 'cursor-pointer',
              isDragActive
                ? 'border-primary bg-primary-soft dark:border-night-primary dark:bg-night-primary-soft'
                : 'border-line-strong bg-canvas hover:border-primary dark:border-night-line-strong dark:bg-night-canvas dark:hover:border-night-primary',
            )}
          >
            <input {...getInputProps()} />
            {preview ? (
              <>
                <img src={preview} alt="Selected meal" className="absolute inset-0 h-full w-full object-contain" />
                {loading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/65 px-6 text-white" aria-live="polite">
                    <ScanLine aria-hidden="true" className="h-10 w-10 animate-pulse" />
                    <p className="mt-4 font-extrabold">Analyzing your meal</p>
                    <p className="mt-1 text-sm text-white/75">This may take a few moments.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="max-w-md">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary-soft text-primary dark:bg-night-primary-soft dark:text-night-primary">
                  <ImageUp aria-hidden="true" className="h-7 w-7" />
                </span>
                <h2 className="mt-5 text-lg font-extrabold text-ink dark:text-night-ink">
                  {isDragActive ? 'Drop the photo here' : 'Drop a meal photo here'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-ink-muted dark:text-night-muted">
                  Or click anywhere in this area to choose a file from your device.
                </p>
                <p className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-ink-soft dark:text-night-muted">JPG or PNG · One image</p>
              </div>
            )}
          </div>

          {preview && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="tertiary" onClick={clearSelection} disabled={loading}>
                Remove
              </Button>
              <Button type="button" variant="secondary" onClick={open} disabled={loading}>
                <RefreshCw aria-hidden="true" className="h-4 w-4" />
                Choose another
              </Button>
              <Button type="button" onClick={handleAnalyze} loading={loading} disabled={!file}>
                <ScanLine aria-hidden="true" className="h-4 w-4" />
                {loading ? 'Analyzing...' : 'Analyze Meal'}
              </Button>
            </div>
          )}

          {!preview && (
            <Button type="button" onClick={open} size="lg" className="mt-4 w-full sm:w-auto">
              <FileImage aria-hidden="true" className="h-5 w-5" />
              Choose Photo
            </Button>
          )}

          {error && <div className="mt-4"><InlineAlert tone="error">{error}</InlineAlert></div>}
        </section>

        <aside className="space-y-6 lg:sticky lg:top-8">
          <div className="border-l-4 border-primary bg-primary-soft p-5 dark:border-night-primary dark:bg-night-primary-soft">
            <Camera aria-hidden="true" className="h-6 w-6 text-primary dark:text-night-primary" />
            <h2 className="mt-4 font-extrabold text-primary-pressed dark:text-night-ink">For a clearer result</h2>
            <ul className="mt-3 space-y-3 text-sm leading-6 text-ink-muted dark:text-night-muted">
              <li>Keep the whole plate inside the frame.</li>
              <li>Use even lighting and avoid strong shadows.</li>
              <li>Photograph the meal from above where possible.</li>
            </ul>
          </div>

          <div className="flex gap-3 border-t border-line pt-5 dark:border-night-line">
            <ShieldCheck aria-hidden="true" className="h-5 w-5 shrink-0 text-primary dark:text-night-primary" />
            <p className="text-sm leading-6 text-ink-muted dark:text-night-muted">
              Results are estimates. Check the identified foods and adjust portions before saving.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
