'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, Upload, FileVideo, FileImage, CheckCircle2, AlertCircle,
  ChevronRight, ChevronLeft, Target, Wallet, Layout, Sparkles, Folder, X, Trash2
} from 'lucide-react';
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
import { useAdAccount } from '@/contexts/AdAccountContext';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Interfaces (Reused)
interface UploadedVideo { name: string; path: string; size: number; uploadedAt: string; }
interface Beneficiary { id: string; name: string; }
interface ProgressStep { id: string; label: string; status: 'pending' | 'loading' | 'completed' | 'error'; detail?: string; }

// Steps Config
const STEPS = [
  { id: 1, label: 'Creative', icon: FileVideo },
  { id: 2, label: 'Strategy', icon: Target },
  { id: 3, label: 'Identity', icon: Layout },
  { id: 4, label: 'Budget', icon: Wallet },
];

export default function LaunchV3Wizard() {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const { selectedAccounts, selectedPages } = useAdAccount();
  const router = useRouter();

  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data
  const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([]);
  const [selectedExistingVideos, setSelectedExistingVideos] = useState<string[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loadingBeneficiaries, setLoadingBeneficiaries] = useState(false);

  // UI State
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);



  // Form Data
  const [formData, setFormData] = useState({
    mediaFile: null as File | null,
    thumbnailFile: null as File | null,
    selectedAdAccount: '',
    campaignObjective: 'OUTCOME_ENGAGEMENT',
    selectedPage: '',
    budgetType: 'daily' as 'daily' | 'lifetime',
    dailyBudget: 20,
    lifetimeBudget: 1000,
    startTime: '',
    endTime: '',
    useAudienceTimezone: true,
    campaignCount: 1,
    adSetCount: 1,
    adsCount: 1,
    beneficiaryName: '',
    productDescription: '',
    targetAudienceDescription: '',
    // V3 Advanced
    targetCountry: 'TH', // Default to Thailand
    adSource: 'upload' as 'upload' | 'existing',
    selectedPostId: '',
    selectedPostContext: null as any,
    targetingType: 'ai' as 'ai' | 'manual',
    manualInterests: [] as { id: string, name: string }[],
    captionType: 'ai' as 'ai' | 'manual',
    manualCaption: '',
    replyType: 'ai' as 'ai' | 'manual',
    manualReply: '',
    // Placements (NEW)
    placements: ['facebook', 'instagram'] as string[],
  });

  const [pagePosts, setPagePosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [interestSearch, setInterestSearch] = useState('');
  const [foundInterests, setFoundInterests] = useState<any[]>([]);
  const [searchingInterests, setSearchingInterests] = useState(false);

  // Effects
  useEffect(() => {
    // Load file library with debug logging
    console.log('📁 Fetching video library...');
    fetch('/api/videos/list')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log('📁 Video library response:', data);
        console.log('📁 Videos count:', data.videos?.length || 0);
        setUploadedVideos(data.videos || []);
      })
      .catch(err => {
        console.error('📁 Failed to load video library:', err);
      });
  }, []);

  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Posts when Page changes (if source is existing)
  useEffect(() => {
    if (formData.adSource === 'existing' && formData.selectedPage) {
      setLoadingPosts(true);
      fetch(`/api/facebook/posts?pageId=${formData.selectedPage}`)
        .then(res => res.json())
        .then(data => setPagePosts(data.posts || []))
        .catch(err => console.error(err))
        .finally(() => setLoadingPosts(false));
    }
  }, [formData.adSource, formData.selectedPage]);

  // Search Interests
  useEffect(() => {
    if (!interestSearch || interestSearch.length < 2) {
      setFoundInterests([]);
      return;
    }
    const timer = setTimeout(() => {
      setSearchingInterests(true);
      fetch(`/api/targeting/search?q=${encodeURIComponent(interestSearch)}`)
        .then(res => res.json())
        .then(data => setFoundInterests(data.interests || []))
        .finally(() => setSearchingInterests(false));
    }, 500);
    return () => clearTimeout(timer);
  }, [interestSearch]);

  useEffect(() => {
    // Load beneficiaries when account changes
    if (formData.selectedAdAccount) {
      console.log('Fetching beneficiaries for:', formData.selectedAdAccount);
      setLoadingBeneficiaries(true);
      setBeneficiaries([]); // Clear previous

      const url = new URL('/api/facebook/beneficiaries', window.location.origin);
      url.searchParams.set('adAccountId', formData.selectedAdAccount);
      if (formData.selectedPage) url.searchParams.set('pageId', formData.selectedPage);

      fetch(url.toString())
        .then(res => res.json())
        .then(data => {
          console.log('Beneficiaries loaded:', data);
          setBeneficiaries(data.beneficiaries || []);
          if (data.beneficiaries?.[0]) {
            console.log('Auto-selecting:', data.beneficiaries[0].id);
            setFormData(p => ({ ...p, beneficiaryName: data.beneficiaries[0].id }));
          }
        })
        .catch(err => console.error('Error fetching beneficiaries:', err))
        .finally(() => setLoadingBeneficiaries(false));
    }
  }, [formData.selectedAdAccount, formData.selectedPage]);

  // Helpers
  const nextStep = () => setCurrentStep(Math.min(4, currentStep + 1));
  const prevStep = () => setCurrentStep(Math.max(1, currentStep - 1));
  const isStepValid = () => {
    if (currentStep === 1) return formData.mediaFile || selectedExistingVideos.length > 0;
    if (currentStep === 2) return !!formData.campaignObjective; // Context is optional
    if (currentStep === 3) return formData.selectedAdAccount && formData.selectedPage;
    if (currentStep === 4) return true; // Budget has defaults
    return false;
  };

  // Thumbnail handlers
  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError(t('launch.error.imageOnly', 'Please upload image files only for thumbnail'));
        return;
      }
      setFormData({ ...formData, thumbnailFile: file });
      setError('');
    }
  };

  const handleRemoveThumbnail = () => {
    setFormData({ ...formData, thumbnailFile: null });
  };

  // Check if current media is a video
  const isCurrentMediaVideo = () => {
    if (formData.mediaFile) return formData.mediaFile.type.startsWith('video/');
    if (selectedExistingVideos.length > 0) {
      return !!selectedExistingVideos[0]?.match(/\.(mp4|mov|webm|avi)$/i);
    }
    return false;
  };

  const handleLaunch = async () => {
    setLoading(true);
    setError('');
    setIsProgressDialogOpen(true);

    const steps: ProgressStep[] = [
      { id: 'prepare', label: t('launch.v3.progress.prepare', 'Preparing Assets'), status: 'loading' },
      { id: 'ai', label: t('launch.v3.progress.ai', 'AI Optimization'), status: 'pending' },
      { id: 'upload', label: t('launch.v3.progress.upload', 'Uploading Media'), status: 'pending' },
      { id: 'campaign', label: t('launch.v3.progress.campaign', 'Creating Campaign'), status: 'pending' },
    ];
    setProgressSteps(steps);

    try {
      // 1. Prepare
      await new Promise(r => setTimeout(r, 800));
      setProgressSteps(p => p.map(s => s.id === 'prepare' ? { ...s, status: 'completed' } : s));
      setProgressSteps(p => p.map(s => s.id === 'ai' ? { ...s, status: 'loading' } : s));

      // 2. AI (Simulated for UX)
      await new Promise(r => setTimeout(r, 1500));
      setProgressSteps(p => p.map(s => s.id === 'ai' ? { ...s, status: 'completed' } : s));
      setProgressSteps(p => p.map(s => s.id === 'upload' ? { ...s, status: 'loading' } : s));

      // 3. Upload & Launch Logic from V2
      const uploadFd = new FormData();
      // ... Logic to populate FormData (simplified for brevity, assume single file for now or reuse V2 logic)
      if (formData.mediaFile) uploadFd.append('file', formData.mediaFile);
      else if (selectedExistingVideos[0]) uploadFd.append('existingVideo', selectedExistingVideos[0]);

      uploadFd.append('mediaType', formData.mediaFile?.type.startsWith('video') ? 'video' :
        (selectedExistingVideos[0]?.match(/\.(mp4|mov|webm|avi)$/i) ? 'video' : 'image'));

      // Add thumbnail if provided (for videos only)
      if (formData.thumbnailFile && isCurrentMediaVideo()) {
        uploadFd.append('thumbnail', formData.thumbnailFile);
      }
      uploadFd.append('adAccountId', formData.selectedAdAccount);
      uploadFd.append('pageId', formData.selectedPage);
      uploadFd.append('campaignObjective', formData.campaignObjective);
      uploadFd.append('dailyBudget', formData.dailyBudget.toString());
      uploadFd.append('adSetCount', formData.adSetCount.toString());
      uploadFd.append('adsCount', formData.adsCount.toString());
      uploadFd.append('campaignCount', formData.campaignCount.toString());
      uploadFd.append('campaignCount', formData.campaignCount.toString());
      uploadFd.append('productContext', formData.productDescription);
      uploadFd.append('targetCountry', formData.targetCountry);
      uploadFd.append('placements', formData.placements.join(','));

      // Call API
      const res = await fetch('/api/campaigns/create', { method: 'POST', body: uploadFd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');

      setProgressSteps(p => p.map(s => s.id === 'upload' ? { ...s, status: 'completed' } : s));
      setProgressSteps(p => p.map(s => s.id === 'campaign' ? { ...s, status: 'completed' } : s));
      setSuccess('Campaign Launched!');
      setTimeout(() => router.push('/ads-manager?tab=ads&refresh=true'), 2000);

    } catch (err: any) {
      setError(err.message);
      setProgressSteps(p => p.map(s => s.status === 'loading' ? { ...s, status: 'error' } : s));
      setLoading(false);
    }
  };



  return (
    <div className="h-full bg-zinc-50 dark:bg-zinc-950 flex flex-col p-4 md:p-8 overflow-hidden">

      {/* Header */}
      <div className="max-w-4xl mx-auto w-full mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-2">Launch Wizard V3</h1>

        {/* Stepper */}
        <div className="flex items-center justify-between relative mt-6">
          <div className="absolute left-0 top-1/2 w-full h-0.5 bg-zinc-200 dark:bg-zinc-800 -z-0" />
          {STEPS.map((step) => {
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;
            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                            ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110' :
                    isCompleted ? 'bg-green-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'}
                        `}>
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                </div>
                <span className={`text-xs font-medium ${isActive ? 'text-blue-600' : 'text-zinc-500'}`}>{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Card */}
      <div className="flex-1 max-w-4xl mx-auto w-full min-h-0 flex flex-col">
        <Card className="flex-1 shadow-xl border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {/* STEP 1: CREATIVE */}
                {/* STEP 1: CREATIVE */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold">{t('launch.v3.creative.title', 'Creative Source')}</h2>
                        <p className="text-zinc-500 text-sm">{t('launch.v3.creative.subtitle', 'Choose how you want to create your ad')}</p>
                      </div>
                    </div>

                    <Tabs defaultValue="upload" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="upload" onClick={() => setFormData({ ...formData, adSource: 'upload' })}>
                          {t('launch.v3.creative.tab.new', 'Create New Ad')}
                        </TabsTrigger>
                        <TabsTrigger value="existing" onClick={() => setFormData({ ...formData, adSource: 'existing' })}>
                          {t('launch.v3.creative.tab.existing', 'Use Existing Post')}
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="upload" className="mt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Left Column: Upload + Thumbnail */}
                          <div className="space-y-4">
                            {/* Upload Box */}
                            <div className={`
                                                  border-2 border-dashed rounded-xl p-0 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors relative overflow-hidden aspect-video
                                                  ${formData.mediaFile || selectedExistingVideos.length > 0 ? 'border-none bg-black' : 'border-zinc-200 hover:border-blue-400 p-8'}
                                              `}>
                              <input type="file" className="hidden" id="file-upload" accept="video/*,image/*" onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  setFormData({ ...formData, mediaFile: e.target.files[0] });
                                  setSelectedExistingVideos([]); // Clear library selection
                                }
                              }} />

                              {/* PREVIEW LOGIC */}
                              {(formData.mediaFile || (selectedExistingVideos.length > 0 && uploadedVideos.find(v => v.name === selectedExistingVideos[0]))) ? (
                                <div className="absolute inset-0 w-full h-full bg-black group">
                                  {/* Determine Source and Type */}
                                  {(() => {
                                    const file = formData.mediaFile;
                                    const libVideo = selectedExistingVideos.length > 0 ? uploadedVideos.find(v => v.name === selectedExistingVideos[0]) : null;

                                    const src = file ? URL.createObjectURL(file) : libVideo?.path;
                                    const isVideo = file ? file.type.startsWith('video') : (libVideo?.name.match(/\.(mp4|mov|webm)$/i));

                                    if (!src) return null;

                                    return isVideo ? (
                                      <video src={src} className="w-full h-full object-contain" controls autoPlay muted />
                                    ) : (
                                      <img src={src} className="w-full h-full object-contain" alt="Preview" />
                                    );
                                  })()}

                                  {/* Overlay Controls */}
                                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <label htmlFor="file-upload">
                                      <div className="bg-white/90 hover:bg-white text-zinc-800 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer shadow-sm">
                                        {t('launch.v3.actions.replace', 'Replace')}
                                      </div>
                                    </label>
                                    <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={(e) => {
                                      e.preventDefault();
                                      setFormData({ ...formData, mediaFile: null });
                                      setSelectedExistingVideos([]);
                                    }}>
                                      {t('launch.v3.actions.remove', 'Remove')}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <label htmlFor="file-upload" className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                                  <Upload className="w-12 h-12 text-zinc-300 mb-2" />
                                  <p className="font-medium text-zinc-600">{t('launch.v3.creative.upload.label', 'Click to Upload')}</p>
                                  <p className="text-xs text-zinc-400 mt-1">{t('launch.v3.creative.upload.sublabel', 'Video or Image')}</p>
                                </label>
                              )}
                            </div>

                            {/* Thumbnail Upload (Only for Videos) */}
                            {isCurrentMediaVideo() && (
                              <div>
                                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                  {t('launch.v3.thumbnail.label', 'Video Thumbnail')}
                                  <span className="text-zinc-400 font-normal"> ({t('launch.v3.thumbnail.optional', 'Optional')})</span>
                                </p>
                                {!formData.thumbnailFile ? (
                                  <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl p-4 text-center hover:border-blue-400 transition-colors">
                                    <label htmlFor="thumbnail-upload-v3" className="cursor-pointer flex flex-col items-center gap-2">
                                      <FileImage className="w-8 h-8 text-zinc-300" />
                                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                        {t('launch.v3.thumbnail.upload', 'Upload thumbnail image')}
                                      </p>
                                      <p className="text-xs text-zinc-400">1200×628px {t('launch.v3.thumbnail.recommended', 'recommended')}</p>
                                      <input
                                        id="thumbnail-upload-v3"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleThumbnailUpload}
                                        className="hidden"
                                      />
                                    </label>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                                    <div className="w-16 h-10 rounded overflow-hidden flex-shrink-0 bg-zinc-100">
                                      <img
                                        src={URL.createObjectURL(formData.thumbnailFile)}
                                        alt="Thumbnail"
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                        {formData.thumbnailFile.name}
                                      </p>
                                      <p className="text-xs text-zinc-500">
                                        {(formData.thumbnailFile.size / 1024).toFixed(1)} KB
                                      </p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={handleRemoveThumbnail} className="text-red-600 hover:text-red-700">
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Right Column: Library Grid */}
                          <div className="border rounded-xl p-4 flex flex-col bg-zinc-50 dark:bg-zinc-900/50 h-[300px]">
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="font-medium flex items-center gap-2"><Folder className="w-4 h-4" /> {t('launch.v3.creative.library', 'Library')}</h3>
                              <Button variant="ghost" size="sm" onClick={() => setIsFileDialogOpen(true)}>{t('launch.v3.creative.library.viewAll', 'View All')}</Button>
                            </div>

                            <ScrollArea className="flex-1 pr-3">
                              <div className="grid grid-cols-3 gap-2">
                                {uploadedVideos.slice(0, 9).map(v => {
                                  const isSelected = selectedExistingVideos.includes(v.name);
                                  const isVideo = v.name.match(/\.(mp4|mov|webm)$/i);
                                  return (
                                    <div key={v.name}
                                      onClick={() => {
                                        setSelectedExistingVideos([v.name]);
                                        setFormData({ ...formData, mediaFile: null }); // Clear manual upload
                                      }}
                                      className={`
                                                    relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all group
                                                    ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-zinc-200 hover:border-zinc-300'}
                                                `}
                                    >
                                      {isVideo ? (
                                        <video
                                          src={v.path}
                                          className="w-full h-full object-cover pointer-events-none"
                                          muted
                                          playsInline
                                          preload="metadata"
                                          onError={(e) => {
                                            console.error('Video load error for:', v.name, e);
                                            console.error('Video src:', v.path.substring(0, 200));
                                          }}
                                        />
                                      ) : (
                                        <img src={v.path} className="w-full h-full object-cover" alt={v.name} />
                                      )}

                                      {/* Type Badge */}
                                      <div className="absolute top-1 right-1 bg-black/50 text-white text-[8px] px-1 rounded backdrop-blur-sm">
                                        {isVideo ? t('launch.v3.type.video', 'VIDEO') : t('launch.v3.type.image', 'IMG')}
                                      </div>

                                      {/* Delete Button */}
                                      <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        <Button
                                          variant="destructive"
                                          size="icon"
                                          className="h-6 w-6 rounded-full shadow-sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setVideoToDelete(v.name);
                                          }}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>

                                      {/* Hover Overlay */}
                                      <div className={`absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors ${isSelected ? 'bg-transparent' : ''}`} />
                                    </div>
                                  );
                                })}
                              </div>
                              {uploadedVideos.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-xs">
                                  <Folder className="w-8 h-8 mb-2 opacity-20" />
                                  {t('launch.v3.creative.library.empty', 'No files in library')}
                                </div>
                              )}
                            </ScrollArea>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="existing" className="space-y-6">
                        <div className="space-y-2">
                          <Label>{t('launch.v3.creative.selectPage', 'Select Facebook Page')}</Label>
                          <Select
                            value={formData.selectedPage}
                            onValueChange={(v) => setFormData({ ...formData, selectedPage: v })}
                          >
                            <SelectTrigger><SelectValue placeholder={t('launch.v3.creative.selectPage', 'Choose Page')} /></SelectTrigger>
                            <SelectContent>
                              {selectedPages.map(page => (
                                <SelectItem key={page.id} value={page.id}>{page.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {formData.selectedPage && (
                          <div className="space-y-2">
                            <Label>{t('launch.v3.creative.selectPost', 'Select Post')}</Label>
                            {loadingPosts ? (
                              <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                            ) : (
                              <ScrollArea className="h-[400px] border rounded-md p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {pagePosts.map(post => (
                                    <div
                                      key={post.id}
                                      onClick={() => setFormData({ ...formData, selectedPostId: post.id, selectedPostContext: post })}
                                      className={`border rounded-lg p-3 cursor-pointer transition-all hover:border-blue-300 ${formData.selectedPostId === post.id ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                                    >
                                      {post.full_picture && (
                                        <img src={post.full_picture} alt="Post" className="w-full h-32 object-cover rounded mb-2" />
                                      )}
                                      <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-3">
                                        {post.message || t('launch.v3.creative.noText', '(No text)')}
                                      </p>
                                      <div className="mt-2 text-[10px] text-zinc-400">
                                        {new Date(post.created_time).toLocaleDateString()}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {pagePosts.length === 0 && <div className="text-center text-zinc-500 py-10">{t('launch.v3.creative.noPosts', 'No posts found')}</div>}
                              </ScrollArea>
                            )}
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                )}

                {/* STEP 2: STRATEGY */}
                {/* STEP 2: STRATEGY & CONTENT */}
                {currentStep === 2 && (
                  <div className="max-w-2xl mx-auto space-y-6">
                    <div className="space-y-2">
                      <Label>{t('launch.v3.strategy.objective', 'Campaign Objective')}</Label>
                      <Select
                        value={formData.campaignObjective}
                        onValueChange={(v) => setFormData({ ...formData, campaignObjective: v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OUTCOME_ENGAGEMENT">{t('launch.v3.strategy.objective.engagement', 'Engagement (Recommended)')}</SelectItem>
                          <SelectItem value="OUTCOME_TRAFFIC">{t('launch.v3.strategy.objective.traffic', 'Traffic')}</SelectItem>
                          <SelectItem value="OUTCOME_SALES">{t('launch.v3.strategy.objective.sales', 'Sales')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t('launch.v3.strategy.targetCountry', 'Target Country')}</Label>
                      <Select
                        value={formData.targetCountry}
                        onValueChange={(v) => setFormData({ ...formData, targetCountry: v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TH">Thailand 🇹🇭</SelectItem>
                          <SelectItem value="US">United States 🇺🇸</SelectItem>
                          <SelectItem value="GB">United Kingdom 🇬🇧</SelectItem>
                          <SelectItem value="AU">Australia 🇦🇺</SelectItem>
                          <SelectItem value="CA">Canada 🇨🇦</SelectItem>
                          <SelectItem value="JP">Japan 🇯🇵</SelectItem>
                          <SelectItem value="KR">South Korea 🇰🇷</SelectItem>
                          <SelectItem value="VN">Vietnam 🇻🇳</SelectItem>
                          <SelectItem value="ID">Indonesia 🇮🇩</SelectItem>
                          <SelectItem value="MY">Malaysia 🇲🇾</SelectItem>
                          <SelectItem value="SG">Singapore 🇸🇬</SelectItem>
                          <SelectItem value="PH">Philippines 🇵🇭</SelectItem>
                          <SelectItem value="LA">Laos 🇱🇦</SelectItem>
                          <SelectItem value="MM">Myanmar 🇲🇲</SelectItem>
                          <SelectItem value="KH">Cambodia 🇰🇭</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* PLACEMENTS SELECTION */}
                    <div className="space-y-2">
                      <Label>{t('launch.v3.strategy.placements', 'Ad Placements')}</Label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.placements.includes('facebook')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(p => ({ ...p, placements: [...p.placements, 'facebook'].filter((v, i, a) => a.indexOf(v) === i) }));
                              } else {
                                setFormData(p => ({ ...p, placements: p.placements.filter(x => x !== 'facebook') }));
                              }
                            }}
                            className="w-4 h-4 accent-blue-600"
                          />
                          <span className="text-sm font-medium">📘 Facebook</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.placements.includes('instagram')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(p => ({ ...p, placements: [...p.placements, 'instagram'].filter((v, i, a) => a.indexOf(v) === i) }));
                              } else {
                                setFormData(p => ({ ...p, placements: p.placements.filter(x => x !== 'instagram') }));
                              }
                            }}
                            className="w-4 h-4 accent-pink-600"
                          />
                          <span className="text-sm font-medium">📸 Instagram</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.placements.includes('messenger')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(p => ({ ...p, placements: [...p.placements, 'messenger'].filter((v, i, a) => a.indexOf(v) === i) }));
                              } else {
                                setFormData(p => ({ ...p, placements: p.placements.filter(x => x !== 'messenger') }));
                              }
                            }}
                            className="w-4 h-4 accent-purple-600"
                          />
                          <span className="text-sm font-medium">💬 Messenger</span>
                        </label>
                      </div>
                      {formData.placements.length === 0 && (
                        <p className="text-xs text-red-500">{t('launch.v3.strategy.placements.required', 'Please select at least one placement')}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>{t('launch.v3.strategy.productContext', 'Product Context')}</Label>
                      <Textarea
                        value={formData.productDescription}
                        onChange={(e) => setFormData({ ...formData, productDescription: e.target.value })}
                        placeholder={t('launch.v3.strategy.productPlaceholder', "What are you selling? e.g. 'Premium Collagen...'")}
                        className="h-24 resize-none"
                      />
                    </div>

                    <Separator />

                    {/* TARGETING SECTION */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">{t('launch.v3.strategy.targeting', 'Targeting Strategy')}</Label>
                      <Tabs value={formData.targetingType} onValueChange={(v) => setFormData({ ...formData, targetingType: v as any })}>
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="ai"><Sparkles className="w-3 h-3 mr-2" /> {t('launch.v3.strategy.aiAuto', 'AI Auto')}</TabsTrigger>
                          <TabsTrigger value="manual"><Target className="w-3 h-3 mr-2" /> {t('launch.v3.strategy.manual', 'Manual')}</TabsTrigger>
                        </TabsList>

                        <TabsContent value="ai" className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border text-sm text-zinc-500">
                          {t('launch.v3.strategy.aiDesc', 'AI will analyze your content and automatically select the best audience.')}
                        </TabsContent>

                        <TabsContent value="manual" className="space-y-4">
                          <div className="space-y-2">
                            <Label>{t('launch.v3.strategy.searchInterests', 'Search Interests')}</Label>
                            <Input
                              placeholder={t('launch.v3.strategy.targeting.manual.placeholder', 'Type to search (e.g. Skin care, Golf)...')}
                              value={interestSearch}
                              onChange={e => setInterestSearch(e.target.value)}
                            />
                            {searchingInterests && <p className="text-xs text-zinc-500">{t('launch.v3.strategy.targeting.manual.searching', 'Searching...')}</p>}

                            {foundInterests.length > 0 && (
                              <ScrollArea className="h-32 border rounded bg-white dark:bg-zinc-950 p-2">
                                {foundInterests.map(interest => (
                                  <div
                                    key={interest.id}
                                    className="flex justify-between items-center p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer rounded"
                                    onClick={() => {
                                      if (!formData.manualInterests.find(i => i.id === interest.id)) {
                                        setFormData(p => ({ ...p, manualInterests: [...p.manualInterests, interest] }));
                                        setInterestSearch('');
                                        setFoundInterests([]);
                                      }
                                    }}
                                  >
                                    <span className="text-sm font-medium">{interest.name}</span>
                                    <span className="text-xs text-zinc-400">{interest.audience}</span>
                                  </div>
                                ))}
                              </ScrollArea>
                            )}
                          </div>

                          {/* Selected Tags */}
                          <div className="flex flex-wrap gap-2">
                            {formData.manualInterests.map(i => (
                              <Badge key={i.id} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                                {i.name}
                                <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 rounded-full p-0" onClick={() => {
                                  setFormData(p => ({ ...p, manualInterests: p.manualInterests.filter(x => x.id !== i.id) }))
                                }}>
                                  <X className="w-3 h-3" />
                                </Button>
                              </Badge>
                            ))}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>

                    <Separator />

                    {/* CAPTION SECTION */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">{t('launch.v3.strategy.caption', 'Caption Strategy')}</Label>
                      <Tabs value={formData.captionType} onValueChange={(v) => setFormData({ ...formData, captionType: v as any })}>
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="ai"><Sparkles className="w-3 h-3 mr-2" /> {t('launch.v3.strategy.caption.ai', 'AI Generate')}</TabsTrigger>
                          <TabsTrigger value="manual">{t('launch.v3.strategy.caption.manual', 'Write Manually')}</TabsTrigger>
                        </TabsList>

                        <TabsContent value="ai" className="space-y-2">
                          <div className="p-4 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 rounded-lg text-sm">
                            <p>{t('launch.v3.strategy.caption.aiDesc', 'AI will generate 3 variations of captions based on your Product Context.')}</p>
                          </div>
                        </TabsContent>

                        <TabsContent value="manual">
                          <Textarea
                            placeholder={t('launch.v3.strategy.caption.manual.placeholder', 'Write your ad caption here...')}
                            className="h-32"
                            value={formData.manualCaption}
                            onChange={e => setFormData({ ...formData, manualCaption: e.target.value })}
                          />
                        </TabsContent>
                      </Tabs>
                    </div>

                    {/* REPLY SECTION */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">{t('launch.v3.strategy.reply', 'Message Reply')}</Label>
                      <Tabs value={formData.replyType} onValueChange={(v) => setFormData({ ...formData, replyType: v as any })}>
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="ai"><Sparkles className="w-3 h-3 mr-2" /> {t('launch.v3.strategy.reply.ai', 'AI Template')}</TabsTrigger>
                          <TabsTrigger value="manual">{t('launch.v3.strategy.manual', 'Manual')}</TabsTrigger>
                        </TabsList>
                        <TabsContent value="ai" className="text-sm text-zinc-500 p-2">
                          {t('launch.v3.strategy.reply.aiDesc', 'AI will create a JSON template for auto-reply.')}
                        </TabsContent>
                        <TabsContent value="manual">
                          <Textarea
                            placeholder='{"message": "Hello!"}'
                            className="h-20 font-mono text-xs"
                            value={formData.manualReply}
                            onChange={e => setFormData({ ...formData, manualReply: e.target.value })}
                          />
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>
                )}

                {/* STEP 3: IDENTITY */}
                {currentStep === 3 && (
                  <div className="max-w-md mx-auto space-y-6">
                    <div className="space-y-2">
                      <Label>{t('launch.v3.identity.adAccount', 'Ad Account')}</Label>
                      <Select
                        value={formData.selectedAdAccount}
                        onValueChange={(v) => setFormData({ ...formData, selectedAdAccount: v })}
                      >
                        <SelectTrigger><SelectValue placeholder={t('launch.v3.identity.account.placeholder', 'Select Account')} /></SelectTrigger>
                        <SelectContent>
                          {selectedAccounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.account_id}>{acc.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('launch.v3.identity.facebookPage', 'Facebook Page')}</Label>
                      <Select
                        value={formData.selectedPage}
                        onValueChange={(v) => setFormData({ ...formData, selectedPage: v })}
                      >
                        <SelectTrigger><SelectValue placeholder={t('launch.v3.identity.page.placeholder', 'Select Page')} /></SelectTrigger>
                        <SelectContent>
                          {selectedPages.map(page => (
                            <SelectItem key={page.id} value={page.id}>{page.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <Label>{t('launch.v3.identity.beneficiary', 'Beneficiary (Optional)')}</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-blue-600 hover:text-blue-700 font-normal"
                          onClick={() => {
                            // Trigger re-fetch logic manually
                            const temp = formData.selectedAdAccount;
                            setFormData(p => ({ ...p, selectedAdAccount: '' }));
                            setTimeout(() => setFormData(p => ({ ...p, selectedAdAccount: temp })), 50);
                          }}
                        >
                          {t('launch.v3.identity.refresh', 'Refresh Data')}
                        </Button>
                      </div>

                      {loadingBeneficiaries ? (
                        <div className="h-10 flex items-center justify-center border rounded-md bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" /> {t('launch.v3.identity.beneficiary.loading', 'Loading...')}
                        </div>
                      ) : beneficiaries.length > 0 ? (
                        <Select
                          value={formData.beneficiaryName}
                          onValueChange={(v) => setFormData({ ...formData, beneficiaryName: v })}
                        >
                          <SelectTrigger className="h-auto min-h-[48px] py-2">
                            {/* Custom Value Display to ensure Name is shown */}
                            {formData.beneficiaryName ? (
                              <div className="flex flex-col items-start gap-0.5 overflow-hidden">
                                <span className="font-medium truncate w-full text-left">
                                  {beneficiaries.find(b => b.id === formData.beneficiaryName)?.name || formData.beneficiaryName}
                                </span>
                                <span className="text-xs text-zinc-500">ID: {formData.beneficiaryName}</span>
                              </div>
                            ) : (
                              <span className="text-zinc-500">{t('launch.v3.identity.beneficiary.placeholder', 'Select Beneficiary')}</span>
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            {beneficiaries.map(b => (
                              <SelectItem key={b.id} value={b.id}>
                                <div className="flex flex-col text-left py-1">
                                  <span className="font-medium">{b.name}</span>
                                  <span className="text-xs text-zinc-500">ID: {b.id}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-md text-sm text-yellow-800 dark:text-yellow-200 flex gap-2 items-start">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">{t('launch.v3.identity.noBeneficiary', 'No Beneficiary Found')}</p>
                            <p className="text-xs opacity-80 mt-1">
                              {t('launch.v3.identity.noBeneficiaryDesc', "This ad account doesn't have a verified beneficiary. You can still proceed if your ad account settings allow it, or configure it in Meta Business Manager.")}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 4: BUDGET & REVIEW */}
                {currentStep === 4 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <h3 className="font-semibold text-lg">{t('launch.v3.budget.title', 'Budget & Schedule')}</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t('launch.v3.budget.daily', 'Daily Budget ($)')}</Label>
                          <Input type="number"
                            value={formData.dailyBudget}
                            onChange={e => setFormData({ ...formData, dailyBudget: Number(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('launch.v3.budget.structure', 'Campaign Structure')}</Label>
                          <div className="bg-zinc-100 dark:bg-zinc-900 p-2 rounded text-sm text-center">
                            {formData.campaignCount} C / {formData.adSetCount} AS / {formData.adsCount} Ads
                          </div>
                        </div>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-zinc-500 block text-center">{t('launch.v3.budget.campaigns', 'Campaigns')}</Label>
                          <Input
                            type="number"
                            min={1}
                            className="text-center"
                            value={formData.campaignCount}
                            onChange={e => setFormData({ ...formData, campaignCount: Math.max(1, parseInt(e.target.value) || 1) })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-zinc-500 block text-center">{t('launch.v3.budget.adsets', 'Ad Sets')}</Label>
                          <Input
                            type="number"
                            min={1}
                            className="text-center"
                            value={formData.adSetCount}
                            onChange={e => setFormData({ ...formData, adSetCount: Math.max(1, parseInt(e.target.value) || 1) })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-zinc-500 block text-center">{t('launch.v3.budget.ads', 'Ads')}</Label>
                          <Input
                            type="number"
                            min={1}
                            className="text-center"
                            value={formData.adsCount}
                            onChange={e => setFormData({ ...formData, adsCount: Math.max(1, parseInt(e.target.value) || 1) })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-xl border border-blue-100 dark:border-blue-800 space-y-4">
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100">{t('launch.v3.budget.review', 'Review Usage')}</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>{t('launch.v3.budget.estSpend', 'Est. Daily Spend:')}</span>
                          <span className="font-medium">${formData.dailyBudget * formData.campaignCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('launch.v3.budget.targetGroups', 'Targeting Groups:')}</span>
                          <span className="font-medium">{formData.adSetCount} {t('launch.v3.budget.smartAI', 'Groups (Smart AI)')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('launch.v3.budget.adCopies', 'Ad Copies:')}</span>
                          <span className="font-medium">{formData.adsCount} {t('launch.v3.budget.variations', 'Variations')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Buttons */}
          <div className="p-4 border-t bg-zinc-50 dark:bg-zinc-900 flex justify-between items-center">
            <Button variant="outline" onClick={prevStep} disabled={currentStep === 1 || loading}>
              <ChevronLeft className="w-4 h-4 mr-2" /> {t('launch.v3.back', 'Back')}
            </Button>

            {currentStep < 4 ? (
              <Button onClick={nextStep} disabled={!isStepValid()}>
                {t('launch.v3.next', 'Next Step')} <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleLaunch} className="bg-green-600 hover:bg-green-700 w-32" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>🚀 {t('launch.v3.launch', 'Launch')}</>}
              </Button>
            )}
          </div>
        </Card>
      </div >

      {/* View All Files Dialog */}
      < Dialog open={isFileDialogOpen} onOpenChange={setIsFileDialogOpen} >
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('launch.v3.dialog.library.title', 'Media Library')}</DialogTitle>
            <DialogDescription>{t('launch.v3.dialog.library.desc', 'Select a video or image for your ad')}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 p-2">
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4">
              {uploadedVideos.map(v => {
                const isSelected = selectedExistingVideos.includes(v.name);
                const isVideo = v.name.match(/\.(mp4|mov|webm)$/i);
                return (
                  <div key={v.name}
                    className={`
                                      relative aspect-square rounded-lg overflow-hidden border-2 transition-all group
                                      ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-zinc-200 hover:border-zinc-300'}
                                  `}
                  >
                    <div
                      className="w-full h-full cursor-pointer"
                      onClick={() => {
                        setSelectedExistingVideos([v.name]);
                        setFormData({ ...formData, mediaFile: null });
                        setIsFileDialogOpen(false);
                      }}
                    >
                      {isVideo ? (
                        <video
                          src={v.path}
                          className="w-full h-full object-cover pointer-events-none"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <img src={v.path} className="w-full h-full object-cover" alt={v.name} />
                      )}       </div>

                    <div className="absolute top-1 right-1 bg-black/60 text-white text-[9px] px-1.5 rounded backdrop-blur-sm uppercase pointer-events-none">
                      {isVideo ? t('launch.v3.type.video', 'Video') : t('launch.v3.type.image', 'Image')}
                    </div>

                    {/* Delete Button */}
                    <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-6 w-6 rounded-full shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setVideoToDelete(v.name);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>

                    <div className={`absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors pointer-events-none ${isSelected ? 'bg-transparent' : ''}`} />
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog >

      {/* Delete Confirmation Dialog */}
      < AlertDialog open={!!videoToDelete
      } onOpenChange={(open) => !open && setVideoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('launch.v3.dialog.delete.title', 'Are you absolutely sure?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('launch.v3.dialog.delete.desc', 'This action cannot be undone. This will permanently delete')}
              <span className="font-medium text-zinc-900 dark:text-zinc-100 mx-1">
                {videoToDelete}
              </span>
              {t('launch.v3.dialog.delete.descSuffix', 'from your library.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('launch.v3.dialog.delete.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault();
                if (!videoToDelete) return;

                setIsDeleting(true);
                try {
                  const res = await fetch('/api/videos/delete', {
                    method: 'DELETE',
                    body: JSON.stringify({ fileName: videoToDelete })
                  });
                  if (res.ok) {
                    setUploadedVideos(prev => prev.filter(item => item.name !== videoToDelete));
                    if (selectedExistingVideos.includes(videoToDelete)) {
                      setSelectedExistingVideos([]);
                    }
                    setVideoToDelete(null);
                  }
                } catch (err) {
                  console.error('Delete failed', err);
                } finally {
                  setIsDeleting(false);
                }
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              {t('launch.v3.dialog.delete.confirm', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog >

      {/* Progress Dialog */}
      < Dialog open={isProgressDialogOpen} onOpenChange={setIsProgressDialogOpen} >
        <DialogContent>
          <DialogHeader><DialogTitle>{t('launch.v3.dialog.progress.title', 'Launching Campaign')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            {progressSteps.map(s => (
              <div key={s.id} className="flex items-center gap-3">
                {s.status === 'completed' ? <CheckCircle2 className="text-green-500" /> :
                  s.status === 'loading' ? <Loader2 className="animate-spin text-blue-500" /> :
                    <div className="w-6 h-6 rounded-full border-2" />}
                <span className={s.status === 'completed' ? 'text-zinc-900' : 'text-zinc-500'}>{s.label}</span>
              </div>
            ))}
            {success && (
              <div className="text-green-600 font-medium text-center bg-green-50 p-2 rounded">
                {success}
              </div>
            )}
            {error && <div className="text-red-600 bg-red-50 p-2 rounded">{error}</div>}
          </div>
        </DialogContent>
      </Dialog >


    </div >
  );
}
