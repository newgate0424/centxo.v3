'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Upload, Play, Pause, ChevronRight, ChevronLeft, RefreshCw, CheckCircle, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

export default function AutomationCampaignsPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);

    // Step 1: Media & Thumbnail
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [thumbnailBlob, setThumbnailBlob] = useState<Blob | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Upload State
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadedMedia, setUploadedMedia] = useState<{ url: string, filePath: string, filename: string } | null>(null);

    // Step 2: AI Configuration
    const [productContext, setProductContext] = useState('');
    const [adSetCount, setAdSetCount] = useState(3);

    // Step 3: AI Results
    const [aiResult, setAiResult] = useState<any>(null);
    const [selectedCopyIndex, setSelectedCopyIndex] = useState(0);

    // Step 4: Campaign Settings
    const [adAccounts, setAdAccounts] = useState<any[]>([]);
    const [selectedAdAccount, setSelectedAdAccount] = useState('');
    const [pages, setPages] = useState<any[]>([]);
    const [selectedPage, setSelectedPage] = useState('');
    const [objective, setObjective] = useState('OUTCOME_TRAFFIC');
    const [dailyBudget, setDailyBudget] = useState('500');
    const [placements, setPlacements] = useState(['facebook', 'instagram', 'messenger']);

    // Fetch Accounts on Load
    useEffect(() => {
        if (session) {
            fetch('/api/facebook/ad-accounts')
                .then(res => res.json())
                .then(data => {
                    if (data.accounts) setAdAccounts(data.accounts);
                });

            fetch('/api/facebook/pages')
                .then(res => res.json())
                .then(data => {
                    if (data.pages) setPages(data.pages);
                });
        }
    }, [session]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setMediaFile(file);
            setMediaPreview(URL.createObjectURL(file));
            setThumbnailBlob(null);
            setThumbnailPreview(null);
        }
    };

    // Thumbnail State
    const [autoThumbnails, setAutoThumbnails] = useState<string[]>([]);
    const [generatingThumbs, setGeneratingThumbs] = useState(false);
    const thumbnailGenCanvasRef = useRef<HTMLCanvasElement>(null);

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
                    // Add manual capture to list if not exists
                    if (!autoThumbnails.includes(url)) setAutoThumbnails(prev => [...prev, url]);
                }
            }, 'image/jpeg', 0.9);
        }
    };

    // Generate Thumbnails Effect
    useEffect(() => {
        if (mediaFile?.type.startsWith('video') && mediaPreview && videoRef.current) {
            const video = videoRef.current;

            const handleLoadedMetadata = async () => {
                setGeneratingThumbs(true);
                setAutoThumbnails([]);
                const duration = video.duration;
                if (!duration) return;

                const count = 9; // Generate 9 thumbnails (3x3 grid)
                const interval = duration / (count + 1);
                const thumbs: string[] = [];
                const canvas = thumbnailGenCanvasRef.current;

                if (!canvas) return;
                const ctx = canvas.getContext('2d');

                // Helper to seek and capture
                const captureAt = async (time: number) => {
                    return new Promise<void>(resolve => {
                        const onSeeked = () => {
                            if (ctx) {
                                canvas.width = video.videoWidth / 4; // Low res for preview grid
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

                // Capture loop
                // Save current time/state
                const originalTime = video.currentTime;
                const wasPaused = video.paused;

                for (let i = 1; i <= count; i++) {
                    await captureAt(interval * i);
                }

                // Restore state
                video.currentTime = 0; // Reset to start

                setAutoThumbnails(thumbs);
                // Set middle frame as default if none selected
                if (!thumbnailPreview && thumbs.length > 0) {
                    const defaultThumb = thumbs[Math.floor(thumbs.length / 2)];
                    setThumbnailPreview(defaultThumb);
                    fetch(defaultThumb).then(r => r.blob()).then(setThumbnailBlob);
                }

                setGeneratingThumbs(false);
            };

            video.addEventListener('loadedmetadata', handleLoadedMetadata);
            return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        }
    }, [mediaFile, mediaPreview]);

    const runAIAnalysis = async () => {
        if (!mediaFile) return toast.error('Please upload media first');
        if (uploading) return toast.error('Please wait for upload to complete');

        setAnalyzing(true);
        const formData = new FormData();

        // Use existing uploaded media if available to save bandwidth
        if (uploadedMedia) {
            formData.append('existingMediaPath', uploadedMedia.filePath);
            formData.append('existingMediaUrl', uploadedMedia.url);
        } else {
            // Fallback to sending file if upload failed but user retried analysis
            formData.append('file', mediaFile);
        }

        if (thumbnailBlob) {
            console.log("Attaching thumbnailBlob for analysis");
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
                setStep(3); // Go to Review
                toast.success('AI Analysis Complete!');
            } else {
                toast.error(data.error || 'Analysis failed');
            }
        } catch (error) {
            toast.error('Analysis failed');
        } finally {
            setAnalyzing(false);
        }
    };

    const launchCampaign = async () => {
        if (!selectedAdAccount || !selectedPage) return toast.error('Check ad account and page');

        setLoading(true);
        const formData = new FormData();

        // Use existing file info
        if (uploadedMedia) {
            formData.append('existingVideo', uploadedMedia.filename); // API expects method to find file in user folder
            // Note: api/campaigns/create logic looks for file in uploads/videos/USERID/filename or uploads/USERID/filename.
            // Our upload API puts it in the right place via videoStorage.
        } else {
            formData.append('file', mediaFile!);
        }

        if (thumbnailBlob) formData.append('thumbnail', thumbnailBlob as any, 'thumbnail.jpg');

        formData.append('adAccountId', selectedAdAccount);
        formData.append('pageId', selectedPage);
        formData.append('campaignObjective', objective);
        formData.append('dailyBudget', dailyBudget);
        formData.append('placements', placements.join(','));
        formData.append('mediaType', mediaFile!.type.startsWith('video') ? 'video' : 'image');

        // Manual Overrides from Review Step
        formData.append('manualAdCopy', JSON.stringify({
            primaryText: aiResult.adCopyVariations[selectedCopyIndex].primaryText,
            headline: aiResult.adCopyVariations[selectedCopyIndex].headline
        }));
        formData.append('manualTargeting', JSON.stringify(aiResult.interestGroups));
        formData.append('manualIceBreakers', JSON.stringify(aiResult.iceBreakers));
        formData.append('productCategory', aiResult.productCategory); // Pass category for consistency

        try {
            const res = await fetch('/api/campaigns/create', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                toast.success('Campaign Launched Successfully!');
                router.push('/dashboard');
            } else {
                toast.error(data.error || 'Launch Failed');
            }
        } catch (e) {
            toast.error('Launch Error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-5xl space-y-8">
            <div className="flex justify-between items-center border-b pb-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Automation Campaigns
                    </h1>
                    <p className="text-gray-500">AI-Powered Campaign Creation Wizard</p>
                </div>
                <div className="flex gap-2">
                    {[1, 2, 3, 4].map(s => (
                        <div key={s} className={`w-3 h-3 rounded-full ${step >= s ? 'bg-blue-600' : 'bg-gray-200'}`} />
                    ))}
                </div>
            </div>

            {/* Step 1: Upload & Thumbnail */}
            {step === 1 && (
                <Card className="border-2 border-dashed border-gray-200 shadow-sm">
                    <CardContent className="pt-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                            {/* Upload Area */}
                            <div className="space-y-4">
                                <Label>1. Upload Video or Image</Label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="h-64 border-2 border-gray-100 rounded-xl bg-gray-50 flex flex-col items-center justify-center relative overflow-hidden group hover:border-blue-200 transition-all cursor-pointer"
                                >
                                    {/* Upload Progress Overlay */}
                                    {uploading && (
                                        <div className="absolute inset-0 bg-black/60 z-20 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                                            <Loader2 className="w-10 h-10 animate-spin mb-2" />
                                            <div className="font-semibold mb-2">Uploading... {Math.round(uploadProgress)}%</div>
                                            <div className="w-3/4 h-2 bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 transition-all duration-200 ease-linear"
                                                    style={{ width: `${uploadProgress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {mediaPreview ? (
                                        mediaFile?.type.startsWith('video') ? (
                                            <video
                                                ref={videoRef}
                                                src={mediaPreview}
                                                className="w-full h-full object-contain"
                                                controls
                                                // Prevent clicking video from opening upload again
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            <img src={mediaPreview} className="w-full h-full object-contain" alt="preview" />
                                        )
                                    ) : (
                                        <div className="text-center text-gray-400">
                                            <Upload className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                            <span className="text-sm">Click to upload</span>
                                        </div>
                                    )}
                                    <Input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="video/*,image/*"
                                        className="hidden" // Hiding it completely
                                        onChange={handleFileChange}
                                    />
                                </div>
                            </div>

                            {/* Thumbnail Selector (Video Only) */}
                            {mediaFile?.type.startsWith('video') && (
                                <div className="space-y-4">
                                    <Label>2. Select Cover Image (Thumbnail)</Label>

                                    <div className="grid grid-cols-3 gap-2 p-2 bg-gray-50 border rounded-lg h-64 overflow-y-auto">
                                        {/* Auto Generated Thumbnails */}
                                        {autoThumbnails.map((thumb, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => {
                                                    setThumbnailPreview(thumb);
                                                    fetch(thumb).then(r => r.blob()).then(setThumbnailBlob);
                                                }}
                                                className={`relative aspect-[9/16] bg-black cursor-pointer rounded-md overflow-hidden border-2 transition-all ${thumbnailPreview === thumb ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-300'}`}
                                            >
                                                <img src={thumb} className="w-full h-full object-cover" />
                                                {thumbnailPreview === thumb && (
                                                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                                        <CheckCircle className="w-6 h-6 text-white drop-shadow-md" />
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {/* Loading or Empty State */}
                                        {autoThumbnails.length === 0 && (
                                            <div className="col-span-3 h-full flex flex-col items-center justify-center text-gray-400">
                                                {generatingThumbs ? (
                                                    <><Loader2 className="w-6 h-6 animate-spin mb-2" /> Generating Thumbnails...</>
                                                ) : (
                                                    <span>Video loaded, generating previews...</span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center text-xs text-gray-500 px-1">
                                        <span>Or select manually:</span>
                                    </div>

                                    <Button variant="outline" onClick={captureThumbnail} className="w-full text-xs" size="sm">
                                        <Smartphone className="w-3 h-3 mr-2" />
                                        Capture Current Video Frame
                                    </Button>

                                    {/* Helper canvas for generation */}
                                    <canvas ref={thumbnailGenCanvasRef} className="hidden" />
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button onClick={() => setStep(2)} disabled={!mediaFile}>
                                Next: AI Configuration <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                        <canvas ref={canvasRef} className="hidden" />
                    </CardContent>
                </Card>
            )}

            {/* Step 2: AI Config */}
            {step === 2 && (
                <Card>
                    <CardHeader><CardTitle>AI Analysis Configuration</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Product Context (Optional)</Label>
                            <Textarea
                                placeholder="Describe your product briefly (e.g. 'Anti-aging cream for 40+ women')"
                                value={productContext}
                                onChange={e => setProductContext(e.target.value)}
                                className="h-32"
                            />
                            <p className="text-sm text-gray-500">Provide context to help AI understand specific selling points.</p>
                        </div>

                        <div className="space-y-2">
                            <Label>Number of Ad Target Groups to Generate</Label>
                            <Select value={adSetCount.toString()} onValueChange={v => setAdSetCount(parseInt(v))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1 Group</SelectItem>
                                    <SelectItem value="3">3 Groups (Recommended)</SelectItem>
                                    <SelectItem value="5">5 Groups</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex justify-between pt-4">
                            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                            <Button onClick={runAIAnalysis} disabled={analyzing} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                                {analyzing ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing Media...</>
                                ) : (
                                    <><RefreshCw className="w-4 h-4 mr-2" /> Start AI Analysis</>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 3: Review AI Results */}
            {step === 3 && aiResult && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left: Ad Preview */}
                        <Card className="border-indigo-100 shadow-md">
                            <CardHeader className="bg-indigo-50/50 pb-4">
                                <CardTitle className="text-indigo-700 flex items-center">
                                    <CheckCircle className="w-5 h-5 mr-2" /> Review Ad Copy
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <Label>Select Variation</Label>
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    {aiResult.adCopyVariations.map((_: any, idx: number) => (
                                        <Button
                                            key={idx}
                                            variant={selectedCopyIndex === idx ? 'default' : 'outline'}
                                            onClick={() => setSelectedCopyIndex(idx)}
                                            size="sm"
                                        >
                                            Var {idx + 1}
                                        </Button>
                                    ))}
                                </div>

                                <div className="space-y-2">
                                    <Label>Headline</Label>
                                    <Input
                                        value={aiResult.adCopyVariations[selectedCopyIndex].headline}
                                        onChange={(e) => {
                                            const newVars = [...aiResult.adCopyVariations];
                                            newVars[selectedCopyIndex].headline = e.target.value;
                                            setAiResult({ ...aiResult, adCopyVariations: newVars });
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Primary Text</Label>
                                    <Textarea
                                        value={aiResult.adCopyVariations[selectedCopyIndex].primaryText}
                                        className="h-32"
                                        onChange={(e) => {
                                            const newVars = [...aiResult.adCopyVariations];
                                            newVars[selectedCopyIndex].primaryText = e.target.value;
                                            setAiResult({ ...aiResult, adCopyVariations: newVars });
                                        }}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Right: Targeting & Ice Breakers */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader><CardTitle>Targeting Groups</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {aiResult.interestGroups.map((group: any, idx: number) => (
                                            <div key={idx} className="p-3 bg-gray-50 rounded-lg text-sm border">
                                                <div className="font-semibold mb-1 text-gray-700">{group.name}</div>
                                                <div className="flex flex-wrap gap-1">
                                                    {group.interests.map((int: string, i: number) => (
                                                        <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                                                            {int}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle>Messenger Ice Breakers</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {aiResult.iceBreakers?.map((ib: any, idx: number) => (
                                            <div key={idx} className="p-2 border rounded text-center text-sm bg-white shadow-sm">
                                                {ib.question}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div className="flex justify-between pt-4">
                        <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                        <Button onClick={() => setStep(4)}>Next: Campaign Settings <ChevronRight className="w-4 h-4 ml-2" /></Button>
                    </div>
                </div>
            )}

            {/* Step 4: Final Settings */}
            {step === 4 && (
                <Card>
                    <CardHeader><CardTitle>Final Campaign Settings</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Ad Account</Label>
                                <Select value={selectedAdAccount} onValueChange={setSelectedAdAccount}>
                                    <SelectTrigger><SelectValue placeholder="Select Account" /></SelectTrigger>
                                    <SelectContent>
                                        {adAccounts.map(acc => (
                                            <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.account_status === 1 ? 'Active' : 'Inactive'})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Facebook Page</Label>
                                <Select value={selectedPage} onValueChange={setSelectedPage}>
                                    <SelectTrigger><SelectValue placeholder="Select Page" /></SelectTrigger>
                                    <SelectContent>
                                        {pages.map(page => (
                                            <SelectItem key={page.id} value={page.id}>{page.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Objective</Label>
                                <Select value={objective} onValueChange={setObjective}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="OUTCOME_TRAFFIC">Traffic (Click Link)</SelectItem>
                                        <SelectItem value="OUTCOME_SALES">Sales (Conversion)</SelectItem>
                                        <SelectItem value="OUTCOME_ENGAGEMENT">Engagement (Message)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Daily Budget (THB)</Label>
                                <Input type="number" value={dailyBudget} onChange={e => setDailyBudget(e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <Label>Placements</Label>
                            <div className="flex gap-6">
                                {['facebook', 'instagram', 'messenger'].map(p => (
                                    <div key={p} className="flex items-center gap-2">
                                        <Checkbox
                                            id={p}
                                            checked={placements.includes(p)}
                                            onCheckedChange={(checked) => {
                                                if (checked) setPlacements([...placements, p]);
                                                else setPlacements(placements.filter(item => item !== p));
                                            }}
                                        />
                                        <Label htmlFor={p} className="capitalize">{p}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-between pt-6">
                            <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
                            <Button onClick={launchCampaign} disabled={loading} className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white text-lg py-6">
                                {loading ? (
                                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Launching...</>
                                ) : (
                                    "🚀 Publish Campaign"
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
