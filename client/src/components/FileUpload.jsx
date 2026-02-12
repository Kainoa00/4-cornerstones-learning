import { useState, useRef } from 'react';
import { Upload, FileText, Check, Loader2 } from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { API_URL } from '../config';

export default function FileUpload({ onUploadSuccess }) {
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState(null);
    const inputRef = useRef(null);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async () => {
        if (!file) return;

        setIsUploading(true);
        setError(null);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post(`${API_URL}/api/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            onUploadSuccess({
                filename: response.data.filename,
                originalName: response.data.originalName,
                textContent: response.data.textContent
            });
        } catch (error) {
            console.error("Upload failed", error);
            const errorMsg = error.response?.data?.error || "Failed to upload file. Please ensure the server is running.";
            setError(errorMsg);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="w-full max-w-xl mx-auto">
            <div
                className={`relative border-2 border-dashed rounded-xl p-8 transition-colors ${dragActive ? "border-purple-500 bg-purple-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                    }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleChange}
                />

                <div className="flex flex-col items-center justify-center text-center space-y-4">
                    <div className="p-4 bg-white rounded-full shadow-sm">
                        {file ? <FileText className="w-8 h-8 text-purple-600" /> : <Upload className="w-8 h-8 text-gray-400" />}
                    </div>

                    <div>
                        {file ? (
                            <p className="text-lg font-medium text-gray-900">{file.name}</p>
                        ) : (
                            <>
                                <p className="text-lg font-medium text-gray-900">Click to upload or drag and drop</p>
                                <p className="text-sm text-gray-500 mt-1">PDF files only (max 10MB)</p>
                            </>
                        )}
                    </div>

                    {!file && (
                        <button
                            onClick={() => inputRef.current?.click()}
                            className="text-purple-600 font-medium hover:text-purple-700 transition-colors"
                        >
                            Browse files
                        </button>
                    )}

                    {file && (
                        <button
                            onClick={handleSubmit}
                            disabled={isUploading}
                            className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <>
                                    <span>Upload & Analyze</span>
                                    <Check className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}
        </div>
    );
}
