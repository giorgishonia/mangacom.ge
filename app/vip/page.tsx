'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/supabase-auth-provider'; // Or your specific auth hook
import { activateVip } from '@/lib/actions/vip';
import { toast } from 'sonner';
import { Crown, CheckCircle, Star, ShieldCheck, Zap, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

const vipBenefits = [
  { icon: <Star className="h-5 w-5 text-yellow-400" />, text: 'ექსკლუზიური VIP ნიშანი პროფილსა და კომენტარებში' },
  { icon: <ShieldCheck className="h-5 w-5 text-green-400" />, text: 'ატვირთე საბაჟო პროფილის ბანერები შენი გვერდის დასახასიათებლად' },
  { icon: <Zap className="h-5 w-5 text-purple-400" />, text: 'უნიკალური სტილი შენი კომენტარებისთვის' },
  { icon: <CheckCircle className="h-5 w-5 text-blue-400" />, text: 'GIF ავატარის გამოყენების შესაძლებლობა' },
  { icon: <Crown className="h-5 w-5 text-orange-400" />, text: 'სპეციალური საზღვარი შენი ავატარისთვის' },
];

export default function VipPage() {
  const { user, profile, isLoading: authLoading, refreshUserProfile } = useAuth();
  const router = useRouter();
  const [isActivating, setIsActivating] = useState(false);
  const [isVipActive, setIsVipActive] = useState(profile?.vip_status || false);

  useEffect(() => {
    setIsVipActive(profile?.vip_status || false);
  }, [profile]);

  const handleActivateVip = async () => {
    if (!user) {
      toast.error('VIP სტატუსის გასააქტიურებლად გთხოვთ, შედით სისტემაში.');
      router.push('/login');
      return;
    }

    setIsActivating(true);
    const result = await activateVip(user.id);
    setIsActivating(false);

    if (result.success) {
      toast.success('VIP სტატუსი წარმატებით გააქტიურდა!');
      setIsVipActive(true);
      if (refreshUserProfile) {
        await refreshUserProfile(); // Refresh profile data in auth context
      }
      router.push('/profile'); // Redirect to profile page
    } else {
      toast.error(result.error || 'VIP სტატუსის გააქტიურება ვერ მოხერხდა.');
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen bg-black text-white">
        <AppSidebar />
        <main className="flex-1 overflow-x-hidden pl-[77px] flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-400" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-black text-white">
      <AppSidebar />
      <main className="flex-1 overflow-x-hidden pl-[77px] py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="bg-gray-900/70 backdrop-blur-md border border-purple-500/30 rounded-xl p-6 md:p-10 shadow-2xl text-center">
            <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-purple-600 to-pink-500 rounded-full mb-6 shadow-lg">
              <Crown className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
              გახდი VIP
            </h1>
            <p className="text-gray-300 mb-8 md:text-lg">
              გააუმჯობესე შენი Manganime გამოცდილება ექსკლუზიური პრივილეგიებითა და ფუნქციებით. მიიღე VIP სტატუსი ახლავე – სრულიად უფასოდ!
            </p>

            <div className="text-left space-y-4 mb-10 px-4 md:px-8">
              {vipBenefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                  {benefit.icon}
                  <span className="text-gray-200 text-sm md:text-base">{benefit.text}</span>
                </div>
              ))}
            </div>

            {isVipActive ? (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <p className="text-green-300 font-semibold text-lg">თქვენი VIP სტატუსი აქტიურია!</p>
                <p className="text-gray-400 text-sm mt-1">ისიამოვნეთ ექსკლუზიური პრივილეგიებით.</p>
                <Button asChild variant="outline" className="mt-4 bg-transparent hover:bg-white/5 border-gray-600 text-gray-300">
                  <Link href="/profile">პროფილზე გადასვლა</Link>
                </Button>
              </div>
            ) : !user ? (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
                    <AlertTriangle className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                    <p className="text-yellow-300 font-semibold text-lg">VIP-ის მისაღებად შედით</p>
                    <p className="text-gray-400 text-sm mt-1">VIP სტატუსის გასააქტიურებლად საჭიროა ავტორიზაცია.</p>
                    <Button asChild variant="default" className="mt-4 bg-purple-600 hover:bg-purple-500">
                        <Link href="/login?redirect=/vip">შესვლა</Link>
                    </Button>
                </div>
            ) : (
              <Button
                onClick={handleActivateVip}
                disabled={isActivating}
                size="lg"
                className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 text-base md:text-lg"
              >
                {isActivating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    აქტიურდება...
                  </>
                ) : (
                  <>
                    <Crown className="h-5 w-5 mr-2" />
                    მიიღე VIP (უფასო!)
                  </>
                )}
              </Button>
            )}
            
            {!isVipActive && user && (
                <p className="text-xs text-gray-500 mt-6">
                    ღილაკზე "მიიღე VIP" დაჭერით ეთანხმები, რომ ხარ ძალიან მაგარი. გადახდა არ არის საჭირო.
                </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 