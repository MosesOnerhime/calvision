import React, { useState, useCallback } from 'react';
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
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Analyze Your Meal</h1>
      <p className="text-gray-500 mb-6">Upload a clear photo of your meal for instant nutrition analysis.</p>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        {preview ? (
          <img src={preview} alt="Meal preview" className="max-h-64 mx-auto rounded-xl object-contain" />
        ) : (
          <>
            <div className="text-5xl mb-4">📷</div>
            <p className="text-gray-600 font-medium">
              {isDragActive ? 'Drop your meal photo here' : 'Drag & drop a meal photo, or click to select'}
            </p>
            <p className="text-gray-400 text-sm mt-2">Supports JPG and PNG</p>
          </>
        )}
      </div>

      {preview && (
        <div className="mt-4 text-center">
          <button onClick={() => { setFile(null); setPreview(null); }}
            className="text-sm text-gray-500 underline hover:text-gray-700">
            Remove & choose different photo
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleAnalyze}
        disabled={!file || loading}
        className="mt-6 w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-3"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            Analyzing your meal...
          </>
        ) : '🔍 Analyze Meal'}
      </button>

      {loading && (
        <p className="text-center text-gray-400 text-sm mt-3">
          This may take a few seconds while our AI identifies your food items.
        </p>
      )}
    </div>
  );
}