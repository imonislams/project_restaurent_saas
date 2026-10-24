import {
    MarketingHead,
    MarketingLayout,
    SectionHeading,
} from '@/Components/Marketing';
import { Button } from '@/Components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/Card';
import { Input } from '@/Components/ui/Input';
import { Label } from '@/Components/ui/Label';
import { Textarea } from '@/Components/ui/Textarea';
import { trackConversion } from '@/Components/Marketing';
import { Link, useForm, usePage } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, Clock, HelpCircle, Mail, Send } from 'lucide-react';
import { FormEventHandler } from 'react';

export default function Contact() {
    const { flash } = usePage().props as Record<string, any>;

    const { data, setData, post, processing, errors, recentlySuccessful, reset } = useForm({
        name: '',
        email: '',
        restaurant_name: '',
        venue_type: 'restaurant',
        branches_count: '1',
        inquiry_category:
            typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('topic') === 'demo'
                ? 'demo'
                : 'sales',
        message: '',
    });

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('contact.submit'), {
            onSuccess: () => {
                if (data.inquiry_category === 'demo') trackConversion('demo_requested', { location: 'contact_form' });
                reset();
            },
        });
    };

    return (
        <MarketingLayout>
            <MarketingHead
                title="Contact Touch Dine — Sales, Demos & Migration Support"
                description="Get in touch with a Touch Dine restaurant specialist. Book a personalized demo, discuss menu data migration, or request custom enterprise rollouts."
            />

            <section className="pt-14 pb-20 sm:pt-20 sm:pb-28 bg-white">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-14">
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#EC3013] block mb-2">
                            Talk To A Restaurant Specialist
                        </span>
                        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900">
                            How can we support your restaurant?
                        </h1>
                        <p className="text-stone-600 mt-3 text-base">
                            Whether you have questions about printer hardware compatibility, need help migrating your existing menu, or want a guided walkthrough, we are here to help.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        {/* Left 5 Cols: Direct Contact Details & Links */}
                        <div className="lg:col-span-5 space-y-6">
                            <Card className="bg-white border-stone-200">
                                <CardHeader>
                                    <CardTitle className="text-lg font-bold text-stone-900">
                                        Direct Channels
                                    </CardTitle>
                                    <CardDescription className="text-xs text-stone-600">
                                        Speak directly with specialists who understand restaurant operations.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 text-xs sm:text-sm text-stone-600">
                                    <div className="flex items-start gap-3">
                                        <div className="rounded-lg bg-[#EC3013]/10 p-2 text-[#EC3013] shrink-0">
                                            <Mail className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-stone-900">Email Sales &amp; Support</div>
                                            <div className="text-stone-600">support@touchdine.cafe</div>
                                            <div className="text-[11px] text-stone-400 mt-0.5">Average response: &lt; 2 hours</div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 pt-3 border-t border-stone-100">
                                        <div className="rounded-lg bg-stone-100 p-2 text-stone-700 shrink-0">
                                            <Clock className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-stone-900">Hospitality Support Hours</div>
                                            <div className="text-stone-600">7 Days a Week (Shift Hours)</div>
                                            <div className="text-[11px] text-stone-400 mt-0.5">8:00 AM – 11:00 PM Local Time</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-stone-50 border-stone-200">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-bold text-stone-900 flex items-center gap-2">
                                        <HelpCircle className="w-4 h-4 text-[#EC3013]" />
                                        <span>Immediate Answers &amp; Guides</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 text-xs text-stone-600">
                                    <p className="leading-relaxed">
                                        Check our searchable Help Center for printer setup tutorials, cash drawer pairings, and CSV menu import templates.
                                    </p>
                                    <div className="pt-2 flex flex-col gap-2 font-semibold text-xs text-[#EC3013]">
                                        <Link href="/help" className="hover:underline flex items-center gap-1">
                                            <span>Visit the Help Center</span>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </Link>
                                        <Link href="/pricing" className="hover:underline flex items-center gap-1">
                                            <span>Review Pricing &amp; Plans</span>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right 7 Cols: Contact Form */}
                        <div className="lg:col-span-7">
                            <Card className="bg-white border-stone-200">
                                <CardHeader>
                                    <CardTitle className="text-xl font-bold text-stone-900">
                                        Send Us an Inquiry
                                    </CardTitle>
                                    <CardDescription className="text-xs text-stone-600">
                                        Fill out the details below and we will get back to you shortly.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {flash?.success || recentlySuccessful ? (
                                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900 space-y-2">
                                            <div className="font-bold text-base flex items-center gap-2">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                                <span>Message Received Successfully!</span>
                                            </div>
                                            <p className="text-xs sm:text-sm text-emerald-800 leading-relaxed">
                                                Thank you for reaching out. A Touch Dine restaurant solutions specialist will review your request and get back to you within 2 business hours.
                                            </p>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="name" className="text-xs font-semibold text-stone-800">
                                                        Your Name *
                                                    </Label>
                                                    <Input
                                                        id="name"
                                                        type="text"
                                                        value={data.name}
                                                        onChange={(e) => setData('name', e.target.value)}
                                                        placeholder="Elena Rostova"
                                                        className="text-xs sm:text-sm h-10"
                                                        required
                                                    />
                                                    {errors.name && <p className="text-xs text-rose-600">{errors.name}</p>}
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label htmlFor="email" className="text-xs font-semibold text-stone-800">
                                                        Work Email *
                                                    </Label>
                                                    <Input
                                                        id="email"
                                                        type="email"
                                                        value={data.email}
                                                        onChange={(e) => setData('email', e.target.value)}
                                                        placeholder="elena@bistro.com"
                                                        className="text-xs sm:text-sm h-10"
                                                        required
                                                    />
                                                    {errors.email && <p className="text-xs text-rose-600">{errors.email}</p>}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="restaurant_name" className="text-xs font-semibold text-stone-800">
                                                        Restaurant Name *
                                                    </Label>
                                                    <Input
                                                        id="restaurant_name"
                                                        type="text"
                                                        value={data.restaurant_name}
                                                        onChange={(e) => setData('restaurant_name', e.target.value)}
                                                        placeholder="Copper Bistro & Bar"
                                                        className="text-xs sm:text-sm h-10"
                                                        required
                                                    />
                                                    {errors.restaurant_name && <p className="text-xs text-rose-600">{errors.restaurant_name}</p>}
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label htmlFor="venue_type" className="text-xs font-semibold text-stone-800">
                                                        Venue Concept *
                                                    </Label>
                                                    <select
                                                        id="venue_type"
                                                        value={data.venue_type}
                                                        onChange={(e) => setData('venue_type', e.target.value)}
                                                        className="w-full rounded-md border border-stone-300 px-3 py-2 text-xs sm:text-sm focus:border-[#EC3013] focus:ring-1 focus:ring-[#EC3013] bg-white h-10"
                                                    >
                                                        <option value="restaurant">Casual or Fine Dining</option>
                                                        <option value="cafe">Café or Bakery</option>
                                                        <option value="cloud_kitchen">Cloud or Ghost Kitchen</option>
                                                        <option value="qsr">Quick Service (QSR)</option>
                                                        <option value="takeaway">Takeaway &amp; Delivery</option>
                                                        <option value="group">Multi-Location Group</option>
                                                        <option value="other">Other Food Business</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="branches_count" className="text-xs font-semibold text-stone-800">
                                                        Number of Locations
                                                    </Label>
                                                    <select
                                                        id="branches_count"
                                                        value={data.branches_count}
                                                        onChange={(e) => setData('branches_count', e.target.value)}
                                                        className="w-full rounded-md border border-stone-300 px-3 py-2 text-xs sm:text-sm focus:border-[#EC3013] focus:ring-1 focus:ring-[#EC3013] bg-white h-10"
                                                    >
                                                        <option value="1">1 Location (Single Store)</option>
                                                        <option value="2-5">2 – 5 Locations</option>
                                                        <option value="6-15">6 – 15 Locations</option>
                                                        <option value="15+">15+ Locations (Enterprise)</option>
                                                    </select>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label htmlFor="inquiry_category" className="text-xs font-semibold text-stone-800">
                                                        Inquiry Category
                                                    </Label>
                                                    <select
                                                        id="inquiry_category"
                                                        value={data.inquiry_category}
                                                        onChange={(e) => setData('inquiry_category', e.target.value)}
                                                        className="w-full rounded-md border border-stone-300 px-3 py-2 text-xs sm:text-sm focus:border-[#EC3013] focus:ring-1 focus:ring-[#EC3013] bg-white h-10"
                                                    >
                                                        <option value="sales">Sales &amp; Pricing Inquiry</option>
                                                        <option value="demo">Book a Guided Video Demo</option>
                                                        <option value="migration">Menu &amp; Data Migration</option>
                                                        <option value="custom_hardware">Custom Hardware Compatibility</option>
                                                        <option value="partnership">Partner &amp; Reseller Inquiries</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label htmlFor="message" className="text-xs font-semibold text-stone-800">
                                                    Message or Specific Questions *
                                                </Label>
                                                <Textarea
                                                    id="message"
                                                    rows={4}
                                                    value={data.message}
                                                    onChange={(e) => setData('message', e.target.value)}
                                                    placeholder="Tell us about your current setup, hardware questions, or target launch date..."
                                                    className="text-xs sm:text-sm"
                                                    required
                                                />
                                                {errors.message && <p className="text-xs text-rose-600">{errors.message}</p>}
                                            </div>

                                            <div className="pt-2">
                                                <Button
                                                    type="submit"
                                                    className="w-full bg-[#EC3013] hover:bg-[#D02710] active:bg-[#A81E0C] text-white text-sm font-semibold h-11"
                                                    disabled={processing}
                                                >
                                                    <Send className="w-4 h-4 mr-2" />
                                                    {processing ? 'Sending Inquiry…' : 'Submit Inquiry'}
                                                </Button>
                                            </div>

                                            <div className="text-[11px] text-stone-400 text-center pt-1">
                                                We respect your privacy. No spam, ever. Your data is never shared.
                                            </div>
                                        </form>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
