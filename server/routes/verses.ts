import { Router } from "express";

export const versesRouter = Router();

const VERSES = [
  { ref: "2 Corinthians 9:7", en: "Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver.", sw: "Kila mmoja atoe kama alivyokusudia moyoni mwake, si kwa huzuni au kwa kulazimishwa, kwa maana Mungu humpenda anayetoa kwa shangwe." },
  { ref: "Malachi 3:10", en: "Bring the whole tithe into the storehouse, that there may be food in my house. Test me in this, says the Lord Almighty, and see if I will not throw open the floodgates of heaven and pour out so much blessing that there will not be room enough to store it.", sw: "Leteni zaka kamili ghalani, ili chakula kiwe katika nyumba yangu. Nijaribuni kwa hili, asema Bwana Mwenye Nguvu, nanyi mtaona kama sitakufungulieni madirisha ya mbinguni na kumwagieni baraka nyingi mpaka kutakuwa na nafasi ya kutosha kuzihifadhi." },
  { ref: "Proverbs 11:25", en: "A generous person will prosper; whoever refreshes others will be refreshed.", sw: "Mtu mkarimu atastawi; yeyote ambaye anawaburudisha wengine ataburudishwa." },
  { ref: "Luke 6:38", en: "Give, and it will be given to you. A good measure, pressed down, shaken together and running over, will be poured into your lap. For with the measure you use, it will be measured to you.", sw: "Toa, nanyi mtapewa. Kipimo kizuri, kilichokandamizwa, kuketeshwa, na kujaa mno, wataimimina kifuani mwenu. Kwa maana kipimo kile mchopimia ndicho mtakachopimiwa." },
  { ref: "Acts 20:35", en: "It is more blessed to give than to receive.", sw: "Kuna baraka zaidi kutoa kuliko kupokea." },
  { ref: "Proverbs 3:9", en: "Honour the Lord with your wealth, with the firstfruits of all your crops.", sw: "Mheshimu Bwana kwa mali yako, kwa mazao ya kwanza ya mapato yako yote." },
  { ref: "Deuteronomy 16:17", en: "Each of you must bring a gift in proportion to the way the Lord your God has blessed you.", sw: "Kila mmoja wenu atoe kipawa sawia na baraka alizojaliwa na Bwana Mungu wake." },
  { ref: "Exodus 35:5", en: "From what you have, take an offering for the Lord. Everyone who is willing is to bring to the Lord an offering.", sw: "Kutokana na vyote mlivyo navyo, takeni sadaka kwa ajili ya Bwana. Kila mtu aliye tayari na alete sadaka kwa Bwana." },
  { ref: "1 Chronicles 29:14", en: "Everything comes from you, and we have given you only what comes from your hand.", sw: "Kila kitu kinatoka kwako, nasi tumekupa tu kile kinachotoka mkononi mwako." },
  { ref: "Psalm 112:5", en: "Good will come to those who are generous and lend freely, who conduct their affairs with justice.", sw: "Mema yamwandalia yeye aliye mkarimu na anayekopa bure, anayefanya mambo yake kwa haki." },
  { ref: "Proverbs 22:9", en: "The generous will themselves be blessed, for they share their food with the poor.", sw: "Yeye aliye mkarimu atabarikiwa, kwa maana hushirikisha chakula chake na maskini." },
  { ref: "Isaiah 58:10", en: "If you spend yourselves in behalf of the hungry and satisfy the needs of the oppressed, then your light will rise in the darkness, and your night will become like the noonday.", sw: "Ukiwa toa nafsi yako kwa ajili ya wenye njaa na kutosheleza mahitaji ya wanaoteswa, basi nuru yako itachomoza gizani, na giza lako litakuwa kama adhuhuri." },
  { ref: "Hebrews 13:16", en: "Do not forget to do good and to share with others, for with such sacrifices God is pleased.", sw: "Msilinde kufanya wema na kushirikiana na wengine, kwa maana sadaka kama hizo ndizo zimpendezazo Mungu." },
  { ref: "Philippians 4:19", en: "And my God will meet all your needs according to the riches of his glory in Christ Jesus.", sw: "Naye Mungu wangu atakidhi kila hitaji lenu sawasawa na utajiri wake katika utukufu ndani ya Kristo Yesu." },
  { ref: "Psalm 37:21", en: "The wicked borrow and do not repay, but the righteous give generously.", sw: "Waovu hukopa na hawalipi, lakini wenye haki hutoa kwa ukarimu." },
  { ref: "Proverbs 28:27", en: "Those who give to the poor will lack nothing, but those who close their eyes to them receive many curses.", sw: "Anayempa maskini hana upungufu; bali anayefumba macho yake hulaaniwa sana." },
  { ref: "Ecclesiastes 11:1", en: "Ship your grain across the sea; after many days you may receive a return.", sw: "Tia mkate wako juu ya maji, kwani baada ya siku nyingi utapata tena." },
  { ref: "Matthew 6:3-4", en: "But when you give to the needy, do not let your left hand know what your right hand is doing, so that your giving may be in secret.", sw: "Lakini wewe unapotoa misaada, usiruhusu mkono wako wa kushoto ujue kile mkono wako wa kuume unachokifanya, ili misaada yako iwe ya siri." },
  { ref: "Mark 12:43-44", en: "This poor widow has put more into the treasury than all the others. They all gave out of their wealth; but she, out of her poverty, put in everything—all she had to live on.", sw: "Mama huyu mjane ameweka katika hazina zaidi ya wengine wote. Kwa maana wote walitoa kati ya wingi wao; bali yeye, kwa umaskini wake, ameweka yote aliyokuwa nayo—chakula chake chote." },
  { ref: "2 Corinthians 8:12", en: "For if the willingness is there, the gift is acceptable according to what one has, not according to what one does not have.", sw: "Kwa maana ikiwa nia iko tayari, zawadi inakubalika sawasawa na kile mtu anacho, wala si sawasawa na asichokicho." },
  { ref: "2 Corinthians 9:6", en: "Whoever sows sparingly will also reap sparingly, and whoever sows bountifully will also reap bountifully.", sw: "Anayepanda kidogo huvuna kidogo; naye anayepanda kwa wingi huvuna kwa wingi." },
  { ref: "Deuteronomy 15:10", en: "Give generously to them and do so without a grudging heart; then because of this the Lord your God will bless you in all your work and in everything you put your hand to.", sw: "Mpe kwa ukarimu, wala usiwe na moyo wa kusita unapompa, kwa sababu hii Bwana Mungu wako atakubariki katika kazi zako zote na katika kila utakalochukua mkononi mwako." },
  { ref: "1 Timothy 6:18", en: "Command them to do good, to be rich in good deeds, and to be generous and willing to share.", sw: "Waamuru wafanye wema, wawe matajiri katika matendo mema, wawe wakarimu na tayari kushirikiana." },
  { ref: "Proverbs 14:21", en: "Whoever is kind to the needy honours God.", sw: "Anayemwonea huruma maskini anamheshimu Mungu." },
  { ref: "Psalm 41:1", en: "Blessed are those who have regard for the weak; the Lord delivers them in times of trouble.", sw: "Heri anayemwangalia maskini; Bwana atamwokoa wakati wa msiba." },
  { ref: "Proverbs 19:17", en: "Whoever is kind to the poor lends to the Lord, and he will reward them for what they have done.", sw: "Anayemwonea huruma maskini humkopesha Bwana, naye atamlipa kwa wema wake." },
  { ref: "2 Corinthians 9:11", en: "You will be enriched in every way so that you can be generous on every occasion, and through us your generosity will result in thanksgiving to God.", sw: "Mtawekwa tajirika katika kila njia ili mpate kuwa wakarimu kila wakati, na ukarimu wenu utamleta Mungu shukrani kwa njia yetu." },
  { ref: "Malachi 3:8", en: "Will a mere mortal rob God? Yet you rob me. But you ask, 'How are we robbing you?' In tithes and offerings.", sw: "Je! Mwanadamu anamwibia Mungu? Lakini nyinyi mnanibia. Nanyi mwauliza, 'Tunakuwibia kwa namna gani?' Kwa zaka na sadaka." },
  { ref: "Matthew 10:8", en: "Freely you have received; freely give.", sw: "Mmepewa bure, toeni bure." },
  { ref: "1 John 3:17", en: "If anyone has material possessions and sees a brother or sister in need but has no pity on them, how can the love of God be in that person?", sw: "Mtu akiwa na mali ya ulimwengu, akamwona ndugu yake ana uhitaji, naye akamfungia huruma yake, upendo wa Mungu wangeweza kukaa ndani yake?" },
  { ref: "Psalm 24:1", en: "The earth is the Lord's, and everything in it, the world, and all who live in it.", sw: "Dunia ni ya Bwana na yote yaliyomo, ulimwengu na wote wanaoishi ndani yake." },
  { ref: "Proverbs 3:27", en: "Do not withhold good from those to whom it is due, when it is in your power to act.", sw: "Usiwanyime wema wanaostahili, wakati uko katika uwezo wako wa kufanya mema." },
  { ref: "1 Chronicles 29:9", en: "The people rejoiced at the willing response of their leaders, for they had given freely and wholeheartedly to the Lord.", sw: "Watu wakafurahi kwa ajili ya wale waliotoa kwa hiari, kwa maana walitoa kwa moyo mkunjufu kwa Bwana." },
  { ref: "Exodus 36:5", en: "The people are bringing more than enough for doing the work the Lord commanded to be done.", sw: "Watu wanaleta zaidi ya ile inayotosha kwa ajili ya kazi aliyoamuru Bwana ifanyike." },
];

versesRouter.get("/today", (_req, res) => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const verse = VERSES[dayOfYear % VERSES.length];
  res.json(verse);
});
