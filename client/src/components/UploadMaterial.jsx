import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload,
    File,
    FileText,
    Image,
    Video,
    Link as LinkIcon,
    X,
    Check,
    Loader2,
    AlertCircle,
    Sparkles,
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const CONTENT_TYPES = [
    { id: 'pdf', name: 'PDF Document', icon: File, accept: '.pdf', color: 'red' },
    { id: 'text', name: 'Text Content', icon: FileText, accept: '.txt,.md,.doc,.docx', color: 'blue' },
    { id: 'image', name: 'Image', icon: Image, accept: '.jpg,.jpeg,.png,.gif,.webp', color: 'purple' },
    { id: 'video', name: 'Video Link', icon: Video, color: 'pink' },
    { id: 'link', name: 'Web Link', icon: LinkIcon, color: 'green' },
];

export default function UploadMaterial({ onUploadComplete, onClose }) {
    const [step, setStep] = useState('select-type'); // select-type, upload, metadata, processing
    const [selectedType, setSelectedType] = useState(null);
    const [file, setFile] = useState(null);
    const [linkUrl, setLinkUrl] = useState('');
    const [textContent, setTextContent] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    // Metadata form
    const [metadata, setMetadata] = useState({
        title: '',
        description: '',
        subject: '',
        gradeLevel: '',
        tags: [],
    });
    const [tagInput, setTagInput] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleTypeSelect = (type) => {
        setSelectedType(type);
        setStep('upload');
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            validateAndSetFile(droppedFile);
        }
    };

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            validateAndSetFile(selectedFile);
        }
    };

    const validateAndSetFile = (selectedFile) => {
        // Validate file type
        const typeConfig = CONTENT_TYPES.find((t) => t.id === selectedType.id);
        if (typeConfig.accept) {
            const extensions = typeConfig.accept.split(',').map((ext) => ext.trim());
            const fileExtension = '.' + selectedFile.name.split('.').pop().toLowerCase();

            if (!extensions.includes(fileExtension)) {
                setError(`Invalid file type. Please select a ${typeConfig.accept} file.`);
                return;
            }
        }

        // Validate file size (50MB max)
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (selectedFile.size > maxSize) {
            setError('File size exceeds 50MB limit.');
            return;
        }

        setFile(selectedFile);
        setMetadata((prev) => ({
            ...prev,
            title: selectedFile.name.replace(/\.[^/.]+$/, ''), // Remove extension
        }));
        setStep('metadata');
        setError('');
    };

    const handleTextSubmit = () => {
        if (!textContent.trim()) {
            setError('Please enter some text content.');
            return;
        }
        setStep('metadata');
    };

    const handleLinkSubmit = () => {
        if (!linkUrl.trim()) {
            setError('Please enter a valid URL.');
            return;
        }
        // Basic URL validation
        try {
            new URL(linkUrl);
            setStep('metadata');
            setError('');
        } catch {
            setError('Please enter a valid URL (including http:// or https://)');
        }
    };

    const handleAddTag = () => {
        if (tagInput.trim() && !metadata.tags.includes(tagInput.trim())) {
            setMetadata((prev) => ({
                ...prev,
                tags: [...prev.tags, tagInput.trim()],
            }));
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove) => {
        setMetadata((prev) => ({
            ...prev,
            tags: prev.tags.filter((tag) => tag !== tagToRemove),
        }));
    };

    const handleUpload = async () => {
        if (!metadata.title.trim()) {
            setError('Please provide a title for the material.');
            return;
        }

        setLoading(true);
        setError('');
        setStep('processing');

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            let fileUrl = null;
            let fileName = null;
            let fileSize = null;
            let originalContent = null;

            // Upload file to Supabase Storage (if file-based)
            if (file) {
                const fileExt = file.name.split('.').pop();
                const filePath = `${user.id}/${Date.now()}.${fileExt}`;

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('material-files')
                    .upload(filePath, file, {
                        onUploadProgress: (progress) => {
                            const percent = (progress.loaded / progress.total) * 100;
                            setUploadProgress(Math.round(percent));
                        },
                    });

                if (uploadError) {
                    throw uploadError;
                }

                // Get public URL
                const {
                    data: { publicUrl },
                } = supabase.storage.from('material-files').getPublicUrl(filePath);

                fileUrl = publicUrl;
                fileName = file.name;
                fileSize = file.size;
            } else if (selectedType.id === 'text') {
                originalContent = textContent;
            } else if (selectedType.id === 'link' || selectedType.id === 'video') {
                originalContent = linkUrl;
            }

            // Insert material record
            const { data: material, error: insertError } = await supabase
                .from('materials')
                .insert({
                    teacher_id: user.id,
                    title: metadata.title,
                    description: metadata.description || null,
                    content_type: selectedType.id,
                    subject: metadata.subject || null,
                    grade_level: metadata.gradeLevel || null,
                    file_url: fileUrl,
                    file_name: fileName,
                    file_size: fileSize,
                    original_content: originalContent,
                    tags: metadata.tags.length > 0 ? metadata.tags : null,
                })
                .select()
                .single();

            if (insertError) {
                throw insertError;
            }

            // Trigger AI transformation (send to backend)
            await fetch(`${import.meta.env.VITE_API_URL}/api/transform-material`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ materialId: material.id }),
            });

            // Success!
            setTimeout(() => {
                if (onUploadComplete) {
                    onUploadComplete(material);
                }
            }, 1000);
        } catch (err) {
            console.error('Upload error:', err);
            setError(err.message || 'Failed to upload material. Please try again.');
            setStep('metadata');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
                >
                    {/* Header */}
                    <div className="relative bg-gradient-to-r from-purple-600 to-purple-700 p-6 text-white">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <Upload className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-serif font-bold">Upload Learning Material</h2>
                                <p className="text-purple-100 text-sm">
                                    {step === 'select-type' && 'Choose content type'}
                                    {step === 'upload' && 'Upload or enter content'}
                                    {step === 'metadata' && 'Add details'}
                                    {step === 'processing' && 'Processing & transforming...'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                        <AnimatePresence mode="wait">
                            {/* Step 1: Select Content Type */}
                            {step === 'select-type' && (
                                <motion.div
                                    key="select-type"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="grid grid-cols-2 md:grid-cols-3 gap-4"
                                >
                                    {CONTENT_TYPES.map((type) => (
                                        <motion.button
                                            key={type.id}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handleTypeSelect(type)}
                                            className="group relative p-6 border-2 border-gray-200 hover:border-purple-400 rounded-xl transition-all"
                                        >
                                            <div
                                                className={`w-16 h-16 mx-auto mb-3 bg-${type.color}-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}
                                            >
                                                <type.icon className={`w-8 h-8 text-${type.color}-600`} />
                                            </div>
                                            <p className="text-sm font-semibold text-gray-900">{type.name}</p>
                                        </motion.button>
                                    ))}
                                </motion.div>
                            )}

                            {/* Step 2: Upload Content */}
                            {step === 'upload' && selectedType && (
                                <motion.div
                                    key="upload"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                >
                                    {/* File Upload */}
                                    {selectedType.accept && (
                                        <div
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                                                isDragging
                                                    ? 'border-purple-500 bg-purple-50'
                                                    : 'border-gray-300 hover:border-purple-400'
                                            }`}
                                        >
                                            <selectedType.icon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                                            <p className="text-lg font-semibold text-gray-700 mb-2">
                                                Drag and drop your {selectedType.name.toLowerCase()}
                                            </p>
                                            <p className="text-sm text-gray-500 mb-4">or</p>
                                            <label className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl cursor-pointer transition-colors">
                                                Choose File
                                                <input
                                                    type="file"
                                                    accept={selectedType.accept}
                                                    onChange={handleFileSelect}
                                                    className="hidden"
                                                />
                                            </label>
                                            <p className="text-xs text-gray-400 mt-4">
                                                Max file size: 50MB | Formats: {selectedType.accept}
                                            </p>
                                        </div>
                                    )}

                                    {/* Text Input */}
                                    {selectedType.id === 'text' && (
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Paste or type your content
                                            </label>
                                            <textarea
                                                value={textContent}
                                                onChange={(e) => setTextContent(e.target.value)}
                                                placeholder="Enter your text content here..."
                                                rows={12}
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
                                            />
                                            <button
                                                onClick={handleTextSubmit}
                                                className="mt-4 w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors"
                                            >
                                                Continue
                                            </button>
                                        </div>
                                    )}

                                    {/* Link/Video Input */}
                                    {(selectedType.id === 'link' || selectedType.id === 'video') && (
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Enter {selectedType.name} URL
                                            </label>
                                            <input
                                                type="url"
                                                value={linkUrl}
                                                onChange={(e) => setLinkUrl(e.target.value)}
                                                placeholder="https://example.com"
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                            />
                                            <button
                                                onClick={handleLinkSubmit}
                                                className="mt-4 w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors"
                                            >
                                                Continue
                                            </button>
                                        </div>
                                    )}

                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mt-4 flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl"
                                        >
                                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                            <p className="text-sm text-red-700">{error}</p>
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}

                            {/* Step 3: Metadata Form */}
                            {step === 'metadata' && (
                                <motion.div
                                    key="metadata"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-5"
                                >
                                    {/* Title */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Title *
                                        </label>
                                        <input
                                            type="text"
                                            value={metadata.title}
                                            onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                                            placeholder="e.g., Introduction to Photosynthesis"
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                            required
                                        />
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Description
                                        </label>
                                        <textarea
                                            value={metadata.description}
                                            onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                                            placeholder="Brief description of the material..."
                                            rows={3}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
                                        />
                                    </div>

                                    {/* Subject & Grade Level */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Subject
                                            </label>
                                            <input
                                                type="text"
                                                value={metadata.subject}
                                                onChange={(e) => setMetadata({ ...metadata, subject: e.target.value })}
                                                placeholder="e.g., Biology"
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Grade Level
                                            </label>
                                            <input
                                                type="text"
                                                value={metadata.gradeLevel}
                                                onChange={(e) =>
                                                    setMetadata({ ...metadata, gradeLevel: e.target.value })
                                                }
                                                placeholder="e.g., 9-12"
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Tags */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Tags</label>
                                        <div className="flex gap-2 mb-2">
                                            <input
                                                type="text"
                                                value={tagInput}
                                                onChange={(e) => setTagInput(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                                placeholder="Add a tag..."
                                                className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                            />
                                            <button
                                                onClick={handleAddTag}
                                                className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium rounded-xl transition-colors"
                                            >
                                                Add
                                            </button>
                                        </div>
                                        {metadata.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {metadata.tags.map((tag) => (
                                                    <span
                                                        key={tag}
                                                        className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                                                    >
                                                        {tag}
                                                        <button
                                                            onClick={() => handleRemoveTag(tag)}
                                                            className="hover:bg-purple-200 rounded-full p-0.5"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl"
                                        >
                                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                            <p className="text-sm text-red-700">{error}</p>
                                        </motion.div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-3 pt-4">
                                        <button
                                            onClick={() => setStep('upload')}
                                            className="flex-1 py-3 border-2 border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition-colors"
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={handleUpload}
                                            disabled={loading || !metadata.title.trim()}
                                            className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            <Sparkles className="w-5 h-5" />
                                            Upload & Transform
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Step 4: Processing */}
                            {step === 'processing' && (
                                <motion.div
                                    key="processing"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-center py-12"
                                >
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                        className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center"
                                    >
                                        <Sparkles className="w-10 h-10 text-white" />
                                    </motion.div>
                                    <h3 className="text-2xl font-serif font-bold text-gray-900 mb-2">
                                        Processing Your Material
                                    </h3>
                                    <p className="text-gray-600 mb-6">
                                        AI is transforming your content into 4 learning styles...
                                    </p>
                                    {uploadProgress > 0 && uploadProgress < 100 && (
                                        <div className="max-w-sm mx-auto">
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${uploadProgress}%` }}
                                                    className="h-full bg-gradient-to-r from-purple-500 to-purple-700"
                                                />
                                            </div>
                                            <p className="text-sm text-gray-500 mt-2">{uploadProgress}% uploaded</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
