import { useEffect, useRef } from "react"
import { X } from "lucide-react"
import { m, AnimatePresence } from "framer-motion"

interface AssistantChatProps {
  open: boolean
  onClose: () => void
}

const faqs = [
  {
    q: "როგორ დავამატო მანგა ჩემს ბიბლიოთეკაში?",
    a: "გადადი მანგას გვერდზე და დააჭირე \"დამატება\" ღილაკს შესაბამის განყოფილებაში (\"ვკითხულობ\", \"დასრულებული\" და ა.შ.).",
  },
  {
    q: "შევძლებ თუ არა პროფილის ავატარისა და ბანერის შეცვლას?",
    a: "დიახ! პროფილის გვერდზე დააჭირე პარამეტრებს (კბილანას ხატი) და აირჩიე \"Avatar\" ან \"Banner\" ცვლილებისათვის.",
  },
  {
    q: "რა არის VIP სტატუსი?",
    a: "VIP იძლევა ექსკლუზიურ ბეიჯსა და ბანერის ატვირთვის შესაძლებლობას, ასევე რეკლამების გაუქმებას საიტზე.",
  },
  {
    q: "შემიძლია თუ არა კითხვების/შეთავაზებების გაგზავნა?",
    a: "დიახ, \"შემოთავაზებები\" განყოფილებაში შეგიძლია ახალი იდეის დამატება ან კომენტარი სხვების იდეებზე.",
  },
  {
    q: "როგორ შევაფასო მანგა ან კომიქსი?",
    a: "გადადი სათაურის გვერდზე და გამოიყენე ვარსკვლავური რეიტინგის ვიჯეტი, შემდეგ დააკონფირმე შეფასება ღილაკით.",
  },
  {
    q: "შემიძლია თუ არა კითხვის ისტორიის გადატვირთვა?",
    a: "პროფილის > ისტორიის განყოფილებაში შეგიძლია თვალით ყურების ისტორიის ნახვა და \"გასუფთავება\" ღილაკით მისი წაშლა.",
  },
  {
    q: "რა ენებია ხელმისაწვდომი საიტზე?",
    a: "ინტერფეისი ამჟამად ხელმისაწვდომია ქართულ, იაპონურ და ინგლისურ ენებზე. დამატებითი ენები მალე დაემატება!",
  },
  {
    q: "როგორ დავუკავშირდე მხარდამჭერ გუნდს?",
    a: "გამოიყენე \"კონტაქტი\" ბმული გვერდის ქვედა ნაწილში ან მოგვწერე Discord-ზე: discord.gg/manganime.",
  },
]

export default function AssistantChat({ open, onClose }: AssistantChatProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (open) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <m.div
          ref={cardRef}
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-32 right-6 w-80 md:w-96 z-50 backdrop-blur-lg border border-white/10 rounded-xl shadow-lg p-4 space-y-4 opacity-100"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">MangaBot FAQ</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
            {faqs.map((f, idx) => (
              <details key={idx} className="group rounded-lg bg-gray-800/70 p-3">
                <summary className="cursor-pointer list-none flex items-center justify-between text-purple-400 group-open:text-white">
                  <span className="text-sm font-medium">{f.q}</span>
                  <span className="ml-2 text-xs text-gray-400">{idx + 1}</span>
                </summary>
                <p className="mt-2 text-sm text-gray-300 leading-relaxed">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
} 