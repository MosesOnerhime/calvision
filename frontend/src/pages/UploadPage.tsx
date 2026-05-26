import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
    maxFiles: 1,
  });

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
    } catch (err: any) {
      setError(err.response?.data?.error || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-6 items-start">
        <section className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm dark:bg-gray-900 dark:border-gray-800">
          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Analyze Meal</p>
          <h1 className="text-3xl font-bold text-gray-950 mt-1 dark:text-white">Upload a meal photo</h1>
          <p className="text-gray-500 mt-3 dark:text-gray-400">
            Use a clear, well-lit image so the model has the best chance of identifying the food.
          </p>

          <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600 dark:text-gray-300">
            {['JPG', 'PNG', '1 image'].map(item => (
              <div key={item} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm dark:bg-gray-900 dark:border-gray-800">
          <div
            {...getRootProps()}
            className={`min-h-[360px] border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors flex items-center justify-center ${
              isDragActive ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-gray-300 hover:border-green-400 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
            }`}
          >
            <input {...getInputProps()} />
            {preview ? (
              <img src={preview} alt="Meal preview" className="max-h-[520px] w-full object-contain rounded-lg" />
            ) : (
              <div>
                <div className="mx-auto h-14 w-14 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-green-700 font-black dark:bg-green-950 dark:border-green-900 dark:text-green-300">
                  +
                </div>
                <p className="text-gray-800 font-semibold mt-4 dark:text-gray-100">
                  {isDragActive ? 'Drop your meal photo here' : 'Drag and drop a meal photo, or click to select'}
                </p>
                <p className="text-gray-500 text-sm mt-2 dark:text-gray-400">Supports JPG and PNG</p>
              </div>
            )}
          </div>

          {preview && (
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => { setFile(null); setPreview(null); }}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition-colors dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Choose Different Photo
              </button>
              <button
                onClick={handleAnalyze}
                disabled={!file || loading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {loading ? 'Analyzing...' : 'Analyze Meal'}
              </button>
            </div>
          )}

          {!preview && (
            <button
              onClick={handleAnalyze}
              disabled={!file || loading}
              className="mt-4 w-full bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Analyze Meal
            </button>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm dark:bg-red-950 dark:border-red-900 dark:text-red-300">
              {error}
            </div>
          )}

          {loading && (
            <p className="text-center text-gray-500 text-sm mt-3 dark:text-gray-400">
              Analyzing your meal. This may take a few seconds.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
