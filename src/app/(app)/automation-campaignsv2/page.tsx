'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAdAccount } from '@/contexts/AdAccountContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Loader2, Upload, ChevronRight, ChevronLeft, RefreshCw,
    CheckCircle, Sparkles, Eye, Rocket, Save, Wand2,
    Facebook, Instagram, MessageCircle, Target, DollarSign, Video
} from 'lucide-react';
import { showSuccessToast, showErrorToast, showInfoToast } from '@/utils/custom-toast';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AutomationCampaignsV2Page() {
    const { t } = useLanguage();
    const { data: session } = useSession();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 1: Media & Thumbnail
    const [uploadSource, setUploadSource] = useState<'upload' | 'library'>('upload');
    const [libraryVideos, setLibraryVideos] = useState<any[]>([]);
    const [selectedLibraryVideo, setSelectedLibraryVideo] = useState<any>(null);
    const [loadingLibrary, setLoadingLibrary] = useState(false);
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [thumbnailBlob, setThumbnailBlob] = useState<Blob | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
    const [autoThumbnails, setAutoThumbnails] = useState<string[]>([]);
    const [generatingThumbs, setGeneratingThumbs] = useState(false);
    const [isVerticalVideo, setIsVerticalVideo] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const thumbnailGenCanvasRef = useRef<HTMLCanvasElement>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const customThumbnailInputRef = useRef<HTMLInputElement>(null);

    // Step 2: AI Configuration
    const [productContext, setProductContext] = useState('');
    const [adSetCount, setAdSetCount] = useState(3);
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook', 'instagram']);

    // Step 3: AI Results
    const [analyzing, setAnalyzing] = useState(false);
    const [aiResult, setAiResult] = useState<any>(null);
    const [selectedCopyIndex, setSelectedCopyIndex] = useState(0);
    const [editedCaptions, setEditedCaptions] = useState<any[]>([]);
    const [editedTargeting, setEditedTargeting] = useState<any[]>([]);
    const [editedIceBreakers, setEditedIceBreakers] = useState<any[]>([]);
    // Video Deletion State
    const [videoToDelete, setVideoToDelete] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Step 4: Campaign Settings
    const { selectedAccounts: adAccounts, selectedPages: pages } = useAdAccount();
    const [selectedAdAccount, setSelectedAdAccount] = useState('');
    // const [pages, setPages] = useState<any[]>([]); // Removed local state
    const [selectedPage, setSelectedPage] = useState('');
    const [objective, setObjective] = useState('OUTCOME_ENGAGEMENT');
    const [dailyBudget, setDailyBudget] = useState('500');
    const [targetCountry, setTargetCountry] = useState('TH');
    const [ageMin, setAgeMin] = useState('18');
    const [ageMax, setAgeMax] = useState('65');
    const [beneficiaryName, setBeneficiaryName] = useState('');
    const [saveDraft, setSaveDraft] = useState(false);

    // Fetch Accounts on Load - REMOVED (Using Context)
    /* 
    useEffect(() => {
       // Removed manual fetch
    }, [session]); 
    */

    const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Clear all states first
            setThumbnailBlob(null);
            setThumbnailPreview(null);
            setSelectedLibraryVideo(null);
            setAutoThumbnails([]); // Clear BEFORE setting new file

            setMediaFile(file);
            setMediaPreview(URL.createObjectURL(file));

            // Upload video immediately if it's a video file
            if (file.type.startsWith('video/')) {
                try {
                    console.log('📤 Uploading video to server...');
                    const formData = new FormData();
                    formData.append('file', file);

                    const response = await fetch('/api/videos/upload', {
                        method: 'POST',
                        body: formData,
                    });

                    const data = await response.json();

                    if (data.success && data.thumbnailUrls && data.thumbnailUrls.length > 0) {
                        console.log(`✅ Video uploaded! Received ${data.thumbnailUrls.length} thumbnails from server`);
                        setAutoThumbnails(data.thumbnailUrls);
                        setGeneratingThumbs(false);

                        // Set default thumbnail (middle one)
                        const defaultThumb = data.thumbnailUrls[Math.floor(data.thumbnailUrls.length / 2)];
                        setThumbnailPreview(defaultThumb);

                        // Fetch blob for the default thumbnail
                        fetch(defaultThumb)
                            .then(r => r.blob())
                            .then(setThumbnailBlob)
                            .catch(err => console.error('Failed to fetch thumbnail blob:', err));
                    } else {
                        console.log('⚠️ No thumbnails received from server, will generate client-side');
                    }
                } catch (error) {
                    console.error('Upload failed:', error);
                    // Continue with client-side thumbnail generation as fallback
                }
            }
        }
    };

    const handleCustomThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Create preview URL
            const url = URL.createObjectURL(file);

            // Set as current thumbnail
            setThumbnailPreview(url);
            setThumbnailBlob(file);

            // Add to auto thumbnails list if not already there
            setAutoThumbnails(prev => [url, ...prev]);

            showSuccessToast(t('automation.v2.toast.coverUploaded', 'Cover image uploaded successfully'));
        }
    };

    const captureThumbnail = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                if (blob) {
                    setThumbnailBlob(blob);
                    const url = URL.createObjectURL(blob);
                    setThumbnailPreview(url);
                    if (!autoThumbnails.includes(url)) setAutoThumbnails(prev => [...prev, url]);
                }
            }, 'image/jpeg', 0.9);
        }
    };

    // Load Library Videos
    useEffect(() => {
        if (uploadSource === 'library' && libraryVideos.length === 0) {
            setLoadingLibrary(true);
            fetch('/api/videos/list')
                .then(res => res.json())
                .then(data => {
                    console.log('Library API response:', data);
                    if (data.videos && Array.isArray(data.videos)) {
                        // Map API response to expected format
                        const mappedVideos = data.videos.map((video: any) => ({
                            id: video.name,
                            filename: video.name,
                            url: video.path,
                            thumbnailUrls: video.thumbnailUrls || [], // Array of thumbnail URLs from R2
                            uploadedAt: video.uploadedAt
                        }));
                        setLibraryVideos(mappedVideos);
                    }
                })
                .catch(err => console.error('Failed to load library:', err))
                .finally(() => setLoadingLibrary(false));
        }
    }, [uploadSource]);

    // Generate Thumbnails Effect
    useEffect(() => {
        // Check if we have a video preview and video element (works for both uploaded and library videos)
        const isVideo = (mediaFile?.type.startsWith('video')) || (!mediaFile && mediaPreview && mediaPreview.includes('/api/'));



        if (isVideo && mediaPreview && videoRef.current) {
            const video = videoRef.current;

            const handleLoadedMetadata = async () => {
                // Detect if video is vertical (portrait)
                const isVertical = video.videoHeight > video.videoWidth;
                setIsVerticalVideo(isVertical);
                console.log('Video Dimensions:', video.videoWidth, 'x', video.videoHeight, 'Is Vertical:', isVertical);

                // Skip generation if we already have thumbnails (from library selection)
                if (autoThumbnails.length > 0) return;

                setGeneratingThumbs(true);
                setAutoThumbnails([]);
                const duration = video.duration;
                if (!duration) return;

                const count = 18; // Generate 18 thumbnails
                const interval = duration / (count + 1);
                const thumbs: string[] = [];
                const canvas = thumbnailGenCanvasRef.current;

                if (!canvas) return;
                const ctx = canvas.getContext('2d');

                const captureAt = async (time: number) => {
                    return new Promise<void>(resolve => {
                        const onSeeked = () => {
                            if (ctx) {
                                canvas.width = video.videoWidth / 4;
                                canvas.height = video.videoHeight / 4;
                                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                                thumbs.push(canvas.toDataURL('image/jpeg', 0.7));
                            }
                            video.removeEventListener('seeked', onSeeked);
                            resolve();
                        };
                        video.addEventListener('seeked', onSeeked);
                        video.currentTime = time;
                    });
                };

                for (let i = 1; i <= count; i++) {
                    await captureAt(interval * i);
                }

                video.currentTime = 0;
                setAutoThumbnails(thumbs);

                if (!thumbnailPreview && thumbs.length > 0) {
                    const defaultThumb = thumbs[Math.floor(thumbs.length / 2)];
                    setThumbnailPreview(defaultThumb);
                    // Convert data URL to blob directly
                    const arr = defaultThumb.split(',');
                    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
                    const bstr = atob(arr[1]);
                    let n = bstr.length;
                    const u8arr = new Uint8Array(n);
                    while (n--) {
                        u8arr[n] = bstr.charCodeAt(n);
                    }
                    setThumbnailBlob(new Blob([u8arr], { type: mime }));
                }

                setGeneratingThumbs(false);
            };

            // Listen for metadata
            video.addEventListener('loadedmetadata', handleLoadedMetadata);

            // If metadata already loaded, trigger manually
            if (video.readyState >= 1) {
                handleLoadedMetadata();
            }

            return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        }
    }, [mediaFile, mediaPreview, autoThumbnails.length]);

    const runAIAnalysis = async () => {
        if (!mediaFile && !selectedLibraryVideo) return showErrorToast(t('automation.v2.toast.selectMedia', 'Please upload media or select from library'));

        setAnalyzing(true);
        const formData = new FormData();

        if (mediaFile) {
            formData.append('file', mediaFile);
        } else if (selectedLibraryVideo) {
            console.log('Using library video:', selectedLibraryVideo);
            formData.append('existingMediaPath', selectedLibraryVideo.url);
            formData.append('existingMediaUrl', selectedLibraryVideo.url);
        }

        // Send ALL thumbnails for comprehensive analysis
        if (autoThumbnails.length > 0) {
            // Optimize: Filter to max 9 thumbnails to reduce payload/latency
            // Pick thumbnails at even intervals
            const maxThumbs = 9;
            const step = Math.ceil(autoThumbnails.length / maxThumbs);
            const selectedThumbnails = autoThumbnails.filter((_, i) => i % step === 0).slice(0, maxThumbs);

            console.log(`📸 Sending ${selectedThumbnails.length} thumbnails (filtered from ${autoThumbnails.length}) for AI analysis`);

            // Parallel fetch for speed with error handling
            await Promise.all(selectedThumbnails.map(async (url, i) => {
                try {
                    // Check if URL is valid before fetching
                    if (!url) return;

                    const response = await fetch(url);
                    if (!response.ok) {
                        console.warn(`Failed to fetch thumbnail ${i}: ${response.status}`);
                        return;
                    }
                    const blob = await response.blob();
                    formData.append('thumbnails', blob, `thumbnail_${i}.jpg`);
                } catch (err) {
                    // Log error but continue - do not fail the entire process
                    console.error(`Failed to fetch thumbnail ${url}:`, err);
                }
            }));
        }
        // Fallback: send selected thumbnail if no auto thumbnails AND it exists
        else if (thumbnailBlob) {
            formData.append('analysisImage', thumbnailBlob, 'thumbnail.jpg');
        }

        formData.append('productContext', productContext);
        formData.append('adSetCount', adSetCount.toString());

        try {
            const res = await fetch('/api/ai/analyze-media', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                setAiResult(data.data);
                setEditedCaptions(data.data.adCopyVariations || []);
                setEditedTargeting(data.data.interestGroups || []);
                setEditedIceBreakers(data.data.iceBreakers || []);
                setStep(3);
                showSuccessToast(t('automation.v2.toast.analysisComplete', 'Analysis complete! 🎉'));
            } else {
                showErrorToast(data.error || t('automation.v2.toast.analysisFailed', 'Analysis failed'));
            }
        } catch (error) {
            showErrorToast(t('automation.v2.toast.analysisError', 'Error during analysis'));
        } finally {
            setAnalyzing(false);
        }
    };

    const regenerateSection = async (section: 'captions' | 'targeting' | 'icebreakers') => {
        if (!aiResult) return;

        setLoading(true);
        showInfoToast(t('automation.v2.toast.regenerating', 'Regenerating...'));

        try {
            const formData = new FormData();
            formData.append('section', section);
            formData.append('productContext', productContext);
            formData.append('adSetCount', adSetCount.toString());
            if (mediaFile) formData.append('file', mediaFile);
            if (thumbnailBlob) formData.append('analysisImage', thumbnailBlob, 'thumbnail.jpg');

            const res = await fetch('/api/ai/regenerate', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (data.success) {
                if (section === 'captions') {
                    setEditedCaptions(data.data.adCopyVariations);
                } else if (section === 'targeting') {
                    setEditedTargeting(data.data.interestGroups);
                } else if (section === 'icebreakers') {
                    setEditedIceBreakers(data.data.iceBreakers);
                }
                showSuccessToast(t('automation.v2.toast.regenComplete', 'Regeneration complete! ✨'));
            } else {
                showErrorToast(t('automation.v2.toast.regenFailed', 'Failed to regenerate'));
            }
        } catch (error) {
            showErrorToast(t('automation.v2.toast.error', 'An error occurred'));
        } finally {
            setLoading(false);
        }
    };

    const launchCampaign = async () => {
        if (!selectedAdAccount || !selectedPage) {
            return showErrorToast(t('automation.v2.toast.selectAccountPage', 'Please select an ad account and page'));
        }

        setLoading(true);
        const formData = new FormData();

        if (mediaFile) {
            formData.append('file', mediaFile);
            formData.append('mediaType', mediaFile.type.startsWith('video') ? 'video' : 'image');
        } else if (selectedLibraryVideo) {
            // Library items are videos in this context
            // Backend expects 'existingVideo' to be the filename, not the full URL path
            console.log('Using library video filename:', selectedLibraryVideo.filename);
            formData.append('existingVideo', selectedLibraryVideo.filename);
            formData.append('mediaType', 'video');
        }

        if (thumbnailBlob) formData.append('thumbnail', thumbnailBlob, 'thumbnail.jpg');

        formData.append('adAccountId', selectedAdAccount);
        formData.append('pageId', selectedPage);
        formData.append('campaignObjective', objective);
        formData.append('dailyBudget', dailyBudget);
        formData.append('targetCountry', targetCountry);
        formData.append('ageMin', ageMin);
        formData.append('ageMax', ageMax);
        formData.append('campaignCount', '1');
        formData.append('adSetCount', adSetCount.toString());
        formData.append('adsCount', '3');
        formData.append('beneficiaryName', beneficiaryName);
        formData.append('placements', selectedPlatforms.join(','));
        // mediaType is already appended above based on source
        formData.append('saveDraft', saveDraft.toString());

        formData.append('manualAdCopy', JSON.stringify({
            primaryText: editedCaptions[selectedCopyIndex]?.primaryText,
            headline: editedCaptions[selectedCopyIndex]?.headline
        }));
        formData.append('manualTargeting', JSON.stringify(editedTargeting));
        formData.append('manualIceBreakers', JSON.stringify(editedIceBreakers));
        formData.append('productCategory', aiResult?.productCategory || '');

        try {
            const res = await fetch('/api/campaigns/create', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                showSuccessToast(saveDraft ? t('automation.v2.launch.draftSaved', 'Draft saved successfully! 📝') : t('automation.v2.launch.success', 'Campaign launched successfully! 🚀'));
                router.push('/dashboard');
            } else {
                showErrorToast(data.error || t('automation.v2.toast.launchFailed', 'Campaign launch failed'));
            }
        } catch (e) {
            showErrorToast(t('automation.v2.toast.error', 'An error occurred'));
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteVideo = async (video: any) => {
        setVideoToDelete(video);
    };

    const confirmDelete = async () => {
        if (!videoToDelete) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/videos/delete`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: videoToDelete.filename })
            });
            const data = await res.json();

            if (data.success) {
                setLibraryVideos(prev => prev.filter(v => v.id !== videoToDelete.id));
                showSuccessToast('Video deleted successfully');
                setVideoToDelete(null);
            } else {
                showErrorToast(data.error || 'Failed to delete video');
            }
        } catch (error) {
            console.error('Delete failed:', error);
            showErrorToast('Error deleting video');
        } finally {
            setIsDeleting(false);
        }
    };

    const steps = [
        { num: 1, title: t('automation.v2.steps.media', 'Upload & Thumbnail'), icon: Upload },
        { num: 2, title: t('automation.v2.steps.analysis', 'AI Analysis'), icon: Sparkles },
        { num: 3, title: t('automation.v2.steps.review', 'Review & Edit'), icon: Eye },
        { num: 4, title: t('automation.v2.steps.launch', 'Launch'), icon: Rocket }
    ];

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto pb-20">
            <div className="space-y-6">

                {/* Progress Steps */}
                <div className="flex justify-center items-center gap-2 md:gap-3 py-3">
                    {steps.map((s, idx) => (
                        <div key={s.num} className="flex items-center">
                            <div className={`flex flex-col items-center transition-all duration-300 ${step >= s.num ? 'scale-105' : 'scale-100 opacity-50'}`}>
                                <div className={`w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center transition-all duration-300 ${step > s.num
                                    ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/50'
                                    : step === s.num
                                        ? 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/50 animate-pulse'
                                        : 'bg-gray-200 dark:bg-gray-700'
                                    }`}>
                                    {step > s.num ? (
                                        <CheckCircle className="w-5 h-5 text-white" />
                                    ) : (
                                        <s.icon className={`w-5 h-5 ${step === s.num ? 'text-white' : 'text-gray-400'}`} />
                                    )}
                                </div>
                                <span className={`text-xs mt-1.5 font-medium ${step >= s.num ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {s.title}
                                </span>
                            </div>
                            {idx < steps.length - 1 && (
                                <div className={`w-6 md:w-12 h-0.5 mx-1.5 rounded-full transition-all duration-300 ${step > s.num ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gray-200 dark:bg-gray-700'
                                    }`} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step Content */}
                {step === 1 && (
                    <Card className="glass-card">
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
                            <CardTitle className="flex items-center gap-2 text-2xl">
                                <Upload className="w-6 h-6 text-blue-600" />
                                {t('automation.v2.media.title', 'Step 1: Upload Media & Select Thumbnail')}
                            </CardTitle>
                            <CardDescription>{t('automation.v2.media.desc', 'Upload a video or image and select a thumbnail.')}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Upload Area */}
                                <div className="space-y-4">
                                    <Tabs defaultValue="upload" value={uploadSource} onValueChange={(v) => setUploadSource(v as 'upload' | 'library')}>
                                        <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="upload">
                                                <Upload className="w-4 h-4 mr-2" />
                                                {t('automation.v2.media.tab.upload', 'Upload New')}
                                            </TabsTrigger>
                                            <TabsTrigger value="library">
                                                <Video className="w-4 h-4 mr-2" />
                                                {t('automation.v2.media.tab.library', 'Library')}
                                            </TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="upload" className="mt-4">
                                            <div
                                                onClick={() => !mediaPreview && fileInputRef.current?.click()}
                                                className="h-72 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center relative overflow-hidden group hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer"
                                            >
                                                {mediaPreview ? (
                                                    <>
                                                        {(mediaFile?.type.startsWith('video') || (!mediaFile && mediaPreview.includes('/api/'))) ? (
                                                            <video
                                                                ref={videoRef}
                                                                src={mediaPreview}
                                                                className="w-full h-full object-contain"
                                                                controls
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        ) : (
                                                            <img src={mediaPreview} className="w-full h-full object-contain" alt="preview" />
                                                        )}
                                                        {/* Delete Button */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setMediaFile(null);
                                                                setMediaPreview(null);
                                                                setThumbnailPreview(null);
                                                                setThumbnailBlob(null);
                                                                setAutoThumbnails([]);
                                                                // Reset file input to allow re-uploading same file
                                                                if (fileInputRef.current) {
                                                                    fileInputRef.current.value = '';
                                                                }
                                                            }}
                                                            className="absolute top-3 right-3 w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 z-10"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
                                                            </svg>
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="text-center text-gray-400 group-hover:text-blue-500 transition-colors">
                                                        <Upload className="w-16 h-16 mx-auto mb-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                                                        <span className="text-lg font-medium">{t('automation.v2.media.clickUpload', 'Click to upload')}</span>
                                                        <p className="text-sm mt-2">{t('automation.v2.media.supports', 'Supports Videos and Images')}</p>
                                                    </div>
                                                )}
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept="video/*,image/*"
                                                    className="hidden"
                                                    onChange={handleMediaUpload}
                                                />
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="library" className="mt-4">
                                            <div className="h-72 border-2 rounded-2xl bg-white p-4 overflow-y-auto">
                                                {loadingLibrary ? (
                                                    <div className="h-full flex items-center justify-center">
                                                        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                                                    </div>
                                                ) : libraryVideos.length === 0 ? (
                                                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                                        <Video className="w-16 h-16 mb-4 opacity-50" />
                                                        <p className="text-sm">{t('automation.v2.media.noLibrary', 'No videos in library')}</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {libraryVideos.map((video: any) => (
                                                            <div
                                                                key={video.id}
                                                                onClick={() => {
                                                                    // Switch to upload tab
                                                                    setUploadSource('upload');
                                                                    // Set video preview
                                                                    setMediaPreview(video.url);
                                                                    setMediaFile(null); // Library video doesn't have File object
                                                                    setSelectedLibraryVideo(video);

                                                                    // Use pre-generated thumbnails if available (from R2)
                                                                    // Note: Old videos might have distorted thumbnails (fixed 16:9), but new uploads will be correct.
                                                                    if (video.thumbnailUrls && video.thumbnailUrls.length > 0) {
                                                                        console.log(`✅ Using ${video.thumbnailUrls.length} pre-generated thumbnails from R2`);
                                                                        setAutoThumbnails(video.thumbnailUrls);
                                                                        setGeneratingThumbs(false);

                                                                        // Set default thumbnail (middle one)
                                                                        const defaultThumb = video.thumbnailUrls[Math.floor(video.thumbnailUrls.length / 2)];
                                                                        setThumbnailPreview(defaultThumb);

                                                                        // Fetch blob for the default thumbnail
                                                                        fetch(defaultThumb)
                                                                            .then(r => r.blob())
                                                                            .then(setThumbnailBlob)
                                                                            .catch(err => console.error('Failed to fetch thumbnail blob:', err));
                                                                    } else {
                                                                        // No pre-generated thumbnails, will generate via useEffect
                                                                        console.log('⚠️ No pre-generated thumbnails, will generate from video');
                                                                        setGeneratingThumbs(true);
                                                                        setAutoThumbnails([]);
                                                                        setThumbnailPreview(null);
                                                                        setThumbnailBlob(null);
                                                                    }
                                                                }}
                                                                className={`group relative aspect-video rounded-lg overflow-hidden cursor-pointer border-2 transition-all hover:border-purple-400 hover:shadow-lg ${mediaPreview === video.url
                                                                    ? 'border-purple-500 ring-4 ring-purple-200'
                                                                    : 'border-gray-200'
                                                                    }`}
                                                            >
                                                                {/* Video Preview with Play Icon */}
                                                                <div className="relative w-full h-full bg-gray-900 pointer-events-none">
                                                                    <video
                                                                        src={video.url}
                                                                        className="w-full h-full object-cover"
                                                                        muted
                                                                    />
                                                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                                                                        <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                                                                            <svg className="w-6 h-6 text-purple-600 ml-1" fill="currentColor" viewBox="0 0 24 24">
                                                                                <path d="M8 5v14l11-7z" />
                                                                            </svg>
                                                                        </div>
                                                                    </div>

                                                                    {/* Delete Button - Only show on hover - IMPROVED CLICKABILITY */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            handleDeleteVideo(video);
                                                                        }}
                                                                        className="absolute top-2 right-2 w-9 h-9 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 z-20 pointer-events-auto cursor-pointer"
                                                                        title="Delete Video"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                                {mediaPreview === video.url && (
                                                                    <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                                                                        <CheckCircle className="w-8 h-8 text-white drop-shadow-lg" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                </div>

                                {/* Thumbnail Selector */}
                                {(mediaFile?.type.startsWith('video') || (!mediaFile && mediaPreview && mediaPreview.includes('/api/'))) && (
                                    <div className="space-y-4">
                                        <Label className="text-lg font-semibold">{t('automation.v2.media.selectThumb', 'Select Thumbnail')}</Label>
                                        <div className={`grid ${isVerticalVideo ? 'grid-cols-6 auto-rows-min' : 'grid-cols-3'} gap-4 p-4 bg-gray-50 border-2 rounded-2xl h-72 overflow-y-auto`}>
                                            {autoThumbnails.map((thumb, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => {
                                                        setThumbnailPreview(thumb);
                                                        fetch(thumb)
                                                            .then(r => r.blob())
                                                            .then(setThumbnailBlob)
                                                            .catch(err => console.error('Failed to load thumbnail blob:', err));
                                                    }}
                                                    className={`relative ${isVerticalVideo ? 'aspect-[9/16]' : 'aspect-video'} bg-black cursor-pointer rounded-lg overflow-hidden transition-all ${thumbnailPreview === thumb
                                                        ? 'ring-4 ring-blue-500 scale-105'
                                                        : 'hover:ring-2 hover:ring-gray-300 hover:scale-105'
                                                        }`}
                                                >
                                                    <img src={thumb} className="w-full h-full object-cover" alt={`Thumbnail ${idx + 1}`} />
                                                    {thumbnailPreview === thumb && (
                                                        <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                                            <CheckCircle className="w-8 h-8 text-white drop-shadow-lg" />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                            {autoThumbnails.length === 0 && (
                                                <div className="col-span-3 h-full flex flex-col items-center justify-center text-gray-400">
                                                    {generatingThumbs ? (
                                                        <>
                                                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                                            <span>Generating thumbnails...</span>
                                                        </>
                                                    ) : (
                                                        <span>Loading video...</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <Button
                                                variant="outline"
                                                onClick={captureThumbnail}
                                                className="w-full"
                                                disabled={!videoRef.current}
                                            >
                                                <Wand2 className="w-4 h-4 mr-2" />
                                                {t('automation.v2.media.capture', 'Capture from Frame')}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => customThumbnailInputRef.current?.click()}
                                                className="w-full"
                                            >
                                                <Upload className="w-4 h-4 mr-2" />
                                                {t('automation.v2.media.uploadCustom', 'Upload Custom Image')}
                                            </Button>
                                        </div>
                                        <input
                                            ref={customThumbnailInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleCustomThumbnailUpload}
                                        />
                                        <canvas ref={thumbnailGenCanvasRef} className="hidden" />
                                    </div>
                                )}
                            </div>

                            <Separator />

                            <div className="flex justify-end">
                                <Button
                                    onClick={() => setStep(2)}
                                    disabled={!mediaPreview}
                                    size="lg"
                                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                >
                                    {t('automation.v2.media.next', 'Next: AI Configuration')}
                                    <ChevronRight className="w-5 h-5 ml-2" />
                                </Button>
                            </div>
                            <canvas ref={canvasRef} className="hidden" />
                        </CardContent>
                    </Card>
                )}

                {/* Step 2: AI Configuration */}
                {step === 2 && (
                    <Card className="glass-card">
                        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
                            <CardTitle className="flex items-center gap-2 text-2xl">
                                <Sparkles className="w-6 h-6 text-purple-600" />
                                {t('automation.v2.analysis.title', 'Step 2: AI Configuration')}
                            </CardTitle>
                            <CardDescription>{t('automation.v2.analysis.desc', 'Provide details for better AI analysis.')}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="context" className="text-base font-semibold">
                                    {t('automation.v2.analysis.context', 'Product/Service Context (Optional)')}
                                </Label>
                                <Textarea
                                    id="context"
                                    placeholder={t('automation.v2.analysis.contextPlaceholder', "e.g. 'Tesla Model 3 for modern lifestyle' or 'Anti-aging cream for women 40+'")}
                                    value={productContext}
                                    onChange={e => setProductContext(e.target.value)}
                                    className="h-32 text-base"
                                />
                                <p className="text-sm text-gray-500">
                                    {t('automation.v2.analysis.hint', '💡 More details help AI generate better content.')}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-base font-semibold">{t('automation.v2.analysis.adSets', 'Number of Ad Sets')}</Label>
                                    <Select value={adSetCount.toString()} onValueChange={v => setAdSetCount(parseInt(v))}>
                                        <SelectTrigger className="text-base">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">{t('automation.v2.analysis.sets', '{count} Set').replace('{count}', '1')}</SelectItem>
                                            <SelectItem value="3">{t('automation.v2.analysis.setsRec', '{count} Sets (Recommended)').replace('{count}', '3')}</SelectItem>
                                            <SelectItem value="5">{t('automation.v2.analysis.sets', '{count} Sets').replace('{count}', '5')}</SelectItem>
                                            <SelectItem value="7">{t('automation.v2.analysis.sets', '{count} Sets').replace('{count}', '7')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-base font-semibold">{t('automation.v2.analysis.platforms', 'Platforms')}</Label>
                                    <div className="flex gap-4 pt-2">
                                        {[
                                            { id: 'facebook', label: t('automation.v2.platform.facebook', 'Facebook'), icon: Facebook },
                                            { id: 'instagram', label: t('automation.v2.platform.instagram', 'Instagram'), icon: Instagram },
                                            { id: 'messenger', label: t('automation.v2.platform.messenger', 'Messenger'), icon: MessageCircle }
                                        ].map(platform => (
                                            <div key={platform.id} className="flex items-center gap-2">
                                                <Checkbox
                                                    id={platform.id}
                                                    checked={selectedPlatforms.includes(platform.id)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setSelectedPlatforms([...selectedPlatforms, platform.id]);
                                                        } else {
                                                            setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform.id));
                                                        }
                                                    }}
                                                />
                                                <Label htmlFor={platform.id} className="flex items-center gap-1 cursor-pointer">
                                                    <platform.icon className="w-4 h-4" />
                                                    {platform.label}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="flex justify-between">
                                <Button variant="outline" onClick={() => setStep(1)} size="lg">
                                    <ChevronLeft className="w-5 h-5 mr-2" />
                                    {t('automation.v2.analysis.back', 'Back')}
                                </Button>
                                <Button
                                    onClick={runAIAnalysis}
                                    disabled={analyzing}
                                    size="lg"
                                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                >
                                    {analyzing ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            {t('automation.v2.analysis.analyzing', 'Analyzing...')}
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5 mr-2" />
                                            {t('automation.v2.analysis.start', 'Start AI Analysis')}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 3: Review & Edit */}
                {step === 3 && aiResult && (
                    <div className="space-y-6">
                        <Card className="glass-card">
                            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
                                <CardTitle className="flex items-center gap-2 text-2xl">
                                    <Eye className="w-6 h-6 text-green-600" />
                                    {t('automation.v2.review.title', 'Step 3: Review & Edit Results')}
                                </CardTitle>
                                <CardDescription>{t('automation.v2.review.desc', 'Review and fine-tune AI-generated content or regenerate.')}</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-8 max-h-[600px] overflow-y-auto">
                                {/* Ad Copy Variations */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-lg font-semibold flex items-center gap-2">
                                            <Wand2 className="w-5 h-5 text-purple-600" />
                                            {t('automation.v2.review.captions', 'Ad Captions')}
                                        </Label>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => regenerateSection('captions')}
                                            disabled={loading}
                                        >
                                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                            Regenerate
                                        </Button>
                                    </div>

                                    {/* Caption Variation Selector */}
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {editedCaptions.map((_, idx) => (
                                            <Button
                                                key={idx}
                                                variant={selectedCopyIndex === idx ? 'default' : 'outline'}
                                                onClick={() => setSelectedCopyIndex(idx)}
                                                size="sm"
                                                className={selectedCopyIndex === idx ? 'bg-gradient-to-r from-blue-600 to-purple-600' : ''}
                                            >
                                                {t('automation.v2.review.captionLabel', 'Caption {index}').replace('{index}', (idx + 1).toString())}
                                            </Button>
                                        ))}
                                    </div>

                                    {/* Selected Caption Editor */}
                                    <div className="space-y-4 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-100">
                                        <div className="space-y-2">
                                            <Label className="font-semibold">{t('automation.v2.review.headline', 'Headline')}</Label>
                                            <Input
                                                value={editedCaptions[selectedCopyIndex]?.headline || ''}
                                                onChange={(e) => {
                                                    const newCaptions = [...editedCaptions];
                                                    newCaptions[selectedCopyIndex].headline = e.target.value;
                                                    setEditedCaptions(newCaptions);
                                                }}
                                                className="text-base font-medium"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="font-semibold">{t('automation.v2.review.primaryText', 'Primary Text')}</Label>
                                            <Textarea
                                                value={editedCaptions[selectedCopyIndex]?.primaryText || ''}
                                                onChange={(e) => {
                                                    const newCaptions = [...editedCaptions];
                                                    newCaptions[selectedCopyIndex].primaryText = e.target.value;
                                                    setEditedCaptions(newCaptions);
                                                }}
                                                className="h-32 text-base"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Targeting Groups */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-lg font-semibold flex items-center gap-2">
                                            <Target className="w-5 h-5 text-green-600" />
                                            {t('automation.v2.review.targeting', 'Target Audience ({count} Groups)').replace('{count}', editedTargeting.length.toString())}
                                        </Label>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => regenerateSection('targeting')}
                                            disabled={loading}
                                        >
                                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                            Regenerate
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {editedTargeting.map((group, idx) => (
                                            <div key={idx} className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-100">
                                                <div className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                                                    <Badge variant="outline" className="bg-white">{t('automation.v2.review.group', 'Group {index}').replace('{index}', (idx + 1).toString())}</Badge>
                                                    {group.name}
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {group.interests?.map((interest: string, i: number) => (
                                                        <Badge key={i} className="bg-green-600 hover:bg-green-700 text-white text-xs">
                                                            {interest}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <Separator />

                                {/* Ice Breakers */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-lg font-semibold flex items-center gap-2">
                                            <MessageCircle className="w-5 h-5 text-blue-600" />
                                            {t('automation.v2.review.iceBreakers', 'Ice Breakers (Auto-reply)')}
                                        </Label>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => regenerateSection('icebreakers')}
                                            disabled={loading}
                                        >
                                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                            Regenerate
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {editedIceBreakers.map((ib, idx) => (
                                            <div
                                                key={idx}
                                                className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg text-center hover:shadow-md transition-shadow"
                                            >
                                                <div className="text-sm font-medium text-blue-900">{ib.question}</div>
                                                <div className="text-xs text-gray-500 mt-1">{ib.payload}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <Separator />

                                {/* Product Category & Confidence */}
                                {aiResult.productCategory && (
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                        <div>
                                            <span className="text-sm text-gray-600">{t('automation.v2.review.productCategory', 'Product Category:')}</span>
                                            <Badge className="ml-2 bg-purple-600">{aiResult.productCategory}</Badge>
                                        </div>
                                        {aiResult.confidence && (
                                            <div>
                                                <span className="text-sm text-gray-600">{t('automation.v2.review.confidence', 'Confidence:')}</span>
                                                <Badge className="ml-2 bg-green-600">
                                                    {Math.round(aiResult.confidence * 100)}%
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Navigation */}
                                <div className="flex justify-between pt-4">
                                    <Button variant="outline" onClick={() => setStep(2)} size="lg">
                                        <ChevronLeft className="w-5 h-5 mr-2" />
                                        {t('automation.v2.analysis.back', 'Back')}
                                    </Button>
                                    <Button
                                        onClick={() => setStep(4)}
                                        size="lg"
                                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                    >
                                        {t('automation.v2.review.next', 'Next: Launch Settings')}
                                        <ChevronRight className="w-5 h-5 ml-2" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Step 4: Launch */}
                {step === 4 && (
                    <Card className="glass-card">
                        <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30">
                            <CardTitle className="flex items-center gap-2 text-2xl">
                                <Rocket className="w-6 h-6 text-orange-600" />
                                {t('automation.v2.launch.title', 'Step 4: Launch Campaign')}
                            </CardTitle>
                            <CardDescription>{t('automation.v2.launch.desc', 'Finalize settings and launch your campaign.')}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6 max-h-[600px] overflow-y-auto">
                            {/* Ad Account & Page Selection */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-base font-semibold flex items-center gap-2">
                                        <Facebook className="w-4 h-4 text-blue-600" />
                                        {t('automation.v2.launch.adAccount', 'Ad Account')}
                                    </Label>
                                    <Select value={selectedAdAccount} onValueChange={setSelectedAdAccount}>
                                        <SelectTrigger className="text-base">
                                            <SelectValue placeholder={t('automation.v2.launch.selectAccount', 'Select Ad Account')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {adAccounts.map(acc => (
                                                <SelectItem key={acc.id} value={acc.id}>
                                                    {acc.name} ({acc.account_status === 1 ? '✓ Active' : '⚠ Inactive'})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-base font-semibold flex items-center gap-2">
                                        <Facebook className="w-4 h-4 text-blue-600" />
                                        {t('automation.v2.launch.page', 'Facebook Page')}
                                    </Label>
                                    <Select value={selectedPage} onValueChange={setSelectedPage}>
                                        <SelectTrigger className="text-base">
                                            <SelectValue placeholder={t('automation.v2.launch.selectPage', 'Select Page')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {pages.map(page => (
                                                <SelectItem key={page.id} value={page.id}>
                                                    {page.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Separator />

                            {/* Campaign Objective & Budget */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-base font-semibold flex items-center gap-2">
                                        <Target className="w-4 h-4 text-green-600" />
                                        {t('automation.v2.launch.objective', 'Campaign Objective')}
                                    </Label>
                                    <Select value={objective} onValueChange={setObjective}>
                                        <SelectTrigger className="text-base">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="OUTCOME_ENGAGEMENT">
                                                {t('automation.v2.objective.engagement', '💬 Engagement (Messages)')}
                                            </SelectItem>
                                            <SelectItem value="OUTCOME_TRAFFIC">
                                                {t('automation.v2.objective.traffic', '🔗 Traffic (Link Clicks)')}
                                            </SelectItem>
                                            <SelectItem value="OUTCOME_SALES">
                                                {t('automation.v2.objective.sales', '💰 Sales (Conversions)')}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-base font-semibold flex items-center gap-2">
                                        <DollarSign className="w-4 h-4 text-green-600" />
                                        {t('automation.v2.launch.budget', 'Daily Budget (THB)')}
                                    </Label>
                                    <Input
                                        type="number"
                                        value={dailyBudget}
                                        onChange={e => setDailyBudget(e.target.value)}
                                        className="text-base"
                                        min="100"
                                        step="50"
                                    />
                                    <p className="text-xs text-gray-500">
                                        {t('automation.v2.launch.minBudget', 'Min 100 THB/day')}
                                    </p>
                                </div>
                            </div>

                            <Separator />

                            {/* Targeting Options */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-base font-semibold flex items-center gap-2">
                                        🌍 {t('automation.v2.launch.country', 'Target Country')}
                                    </Label>
                                    <Select value={targetCountry} onValueChange={setTargetCountry}>
                                        <SelectTrigger className="text-base">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="TH">{t('automation.v2.country.th', '🇹🇭 Thailand')}</SelectItem>
                                            <SelectItem value="US">{t('automation.v2.country.us', '🇺🇸 USA')}</SelectItem>
                                            <SelectItem value="GB">{t('automation.v2.country.gb', '🇬🇧 UK')}</SelectItem>
                                            <SelectItem value="JP">{t('automation.v2.country.jp', '🇯🇵 Japan')}</SelectItem>
                                            <SelectItem value="SG">{t('automation.v2.country.sg', '🇸🇬 Singapore')}</SelectItem>
                                            <SelectItem value="MY">{t('automation.v2.country.my', '🇲🇾 Malaysia')}</SelectItem>
                                            <SelectItem value="VN">{t('automation.v2.country.vn', '🇻🇳 Vietnam')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-base font-semibold flex items-center gap-2">
                                        👤 {t('automation.v2.launch.minAge', 'Min Age')}
                                    </Label>
                                    <Select value={ageMin} onValueChange={setAgeMin}>
                                        <SelectTrigger className="text-base">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: 48 }, (_, i) => i + 18).map(age => (
                                                <SelectItem key={age} value={age.toString()}>
                                                    {age} {t('automation.v2.launch.years', 'Years')}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-base font-semibold flex items-center gap-2">
                                        👤 {t('automation.v2.launch.maxAge', 'Max Age')}
                                    </Label>
                                    <Select value={ageMax} onValueChange={setAgeMax}>
                                        <SelectTrigger className="text-base">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: 48 }, (_, i) => i + 18).map(age => (
                                                <SelectItem key={age} value={age.toString()}>
                                                    {age} Years
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Separator />

                            {/* Placements */}
                            <div className="space-y-3">
                                <Label className="text-base font-semibold">{t('automation.v2.launch.placements', 'Ad Placements')}</Label>
                                <div className="flex flex-wrap gap-4">
                                    {[
                                        { id: 'facebook', label: t('automation.v2.platform.facebook', 'Facebook'), icon: Facebook, color: 'blue' },
                                        { id: 'instagram', label: t('automation.v2.platform.instagram', 'Instagram'), icon: Instagram, color: 'pink' },
                                        { id: 'messenger', label: t('automation.v2.platform.messenger', 'Messenger'), icon: MessageCircle, color: 'purple' }
                                    ].map(platform => (
                                        <div
                                            key={platform.id}
                                            className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all cursor-pointer ${selectedPlatforms.includes(platform.id)
                                                ? `border-${platform.color}-500 bg-${platform.color}-50`
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            onClick={() => {
                                                if (selectedPlatforms.includes(platform.id)) {
                                                    setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform.id));
                                                } else {
                                                    setSelectedPlatforms([...selectedPlatforms, platform.id]);
                                                }
                                            }}
                                        >
                                            <Checkbox
                                                id={`launch-${platform.id}`}
                                                checked={selectedPlatforms.includes(platform.id)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setSelectedPlatforms([...selectedPlatforms, platform.id]);
                                                    } else {
                                                        setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform.id));
                                                    }
                                                }}
                                            />
                                            <Label htmlFor={`launch-${platform.id}`} className="flex items-center gap-2 cursor-pointer font-medium">
                                                <platform.icon className="w-5 h-5" />
                                                {platform.label}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            {/* Draft Option */}
                            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border-2 border-amber-200">
                                <div className="flex items-center gap-3">
                                    <Checkbox
                                        id="saveDraft"
                                        checked={saveDraft}
                                        onCheckedChange={(checked) => setSaveDraft(checked as boolean)}
                                    />
                                    <div>
                                        <Label htmlFor="saveDraft" className="font-semibold cursor-pointer flex items-center gap-2">
                                            <Save className="w-4 h-4" />
                                            {t('automation.v2.launch.saveDraft', 'Save as Draft')}
                                        </Label>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {t('automation.v2.launch.saveDraftDesc', 'Save without launching immediately. You can edit and launch later.')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                                <h4 className="font-semibold text-gray-900">{t('automation.v2.launch.summary', 'Campaign Summary')}</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="text-gray-600">{t('automation.v2.analysis.platforms', 'Platforms')}:</div>
                                    <div className="font-medium">
                                        {selectedPlatforms.map(id => {
                                            if (id === 'facebook') return t('automation.v2.platform.facebook', 'Facebook');
                                            if (id === 'instagram') return t('automation.v2.platform.instagram', 'Instagram');
                                            if (id === 'messenger') return t('automation.v2.platform.messenger', 'Messenger');
                                            return id;
                                        }).join(', ')}
                                    </div>
                                    <div className="text-gray-600">{t('automation.v2.launch.budget', 'Budget')}:</div>
                                    <div className="font-medium">{dailyBudget} {t('automation.v2.launch.perDay', 'THB/day')}</div>
                                    <div className="text-gray-600">{t('automation.v2.review.targeting', 'Targeting')}:</div>
                                    <div className="font-medium">{editedTargeting.length} {t('automation.v2.review.group', 'Groups')}</div>
                                    <div className="text-gray-600">{t('automation.v2.review.captions', 'Captions')}:</div>
                                    <div className="font-medium">{editedCaptions.length} {t('automation.v2.launch.variations', 'Variations')}</div>
                                </div>
                            </div>

                            {/* Navigation */}
                            <div className="flex justify-between pt-4">
                                <Button variant="outline" onClick={() => setStep(3)} size="lg">
                                    <ChevronLeft className="w-5 h-5 mr-2" />
                                    {t('automation.v2.analysis.back', 'Back')}
                                </Button>
                                <Button
                                    onClick={launchCampaign}
                                    disabled={loading || !selectedAdAccount || !selectedPage}
                                    size="lg"
                                    className={`${saveDraft
                                        ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700'
                                        : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                                        } text-lg px-8`}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            {t('automation.v2.launch.launching', 'Launching...')}
                                        </>
                                    ) : saveDraft ? (
                                        <>
                                            <Save className="w-5 h-5 mr-2" />
                                            {t('automation.v2.launch.saveDraft', 'Save Draft')}
                                        </>
                                    ) : (
                                        <>
                                            <Rocket className="w-5 h-5 mr-2" />
                                            {t('automation.v2.launch.launchBtn', 'Launch Campaign')}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
                {/* Delete Confirmation Dialog */}
                <AlertDialog open={!!videoToDelete} onOpenChange={(open) => !open && setVideoToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete the video "{videoToDelete?.filename}". This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.preventDefault();
                                    confirmDelete();
                                }}
                                disabled={isDeleting}
                                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    'Delete Video'
                                )}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}
