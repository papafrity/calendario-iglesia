const translatedScriptures = [
    {
        es: { text: "Y por el poder del Espíritu Santo podréis conocer la verdad de todas las cosas.", ref: "Moroni 10:5" },
        en: { text: "And by the power of the Holy Ghost ye may know the truth of all things.", ref: "Moroni 10:5" },
        pt: { text: "E pelo poder do Espírito Santo podeis saber a verdade de todas as coisas.", ref: "Morôni 10:5" },
        fr: { text: "Et par le pouvoir du Saint-Esprit, vous pouvez connaître la vérité de toutes choses.", ref: "Moroni 10:5" },
        it: { text: "E mediante il potere dello Spirito Santo voi potrete conoscere la verità di ogni cosa.", ref: "Moroni 10:5" },
        de: { text: "Und durch die Macht des Heiligen Geistes könnt ihr von allem wissen, ob es wahr ist.", ref: "Moroni 10:5" }
    },
    {
        es: { text: "Fíate de Jehová de todo tu corazón, y no te apoyes en tu propia prudencia.", ref: "Proverbios 3:5" },
        en: { text: "Trust in the Lord with all thine heart; and lean not unto thine own understanding.", ref: "Proverbs 3:5" },
        pt: { text: "Confia no Senhor de todo o teu coração, e não te estribes no teu próprio entendimento.", ref: "Provérbios 3:5" },
        fr: { text: "Confie-toi en l'Éternel de tout ton cœur, Et ne t'appuie pas sur ta sagesse.", ref: "Proverbes 3:5" },
        it: { text: "Confida nell'Eterno con tutto il tuo cuore, e non appoggiarti sul tuo discernimento.", ref: "Proverbi 3:5" },
        de: { text: "Vertraue auf den Herrn von ganzem Herzen und verlass dich nicht auf deinen eigenen Verstand.", ref: "Sprüche 3:5" }
    },
    {
        es: { text: "Y si los hombres vienen a mí, les mostraré su debilidad... porque mi gracia basta a todos los hombres que se humillan ante mí.", ref: "Éter 12:27" },
        en: { text: "And if men come unto me I will show unto them their weakness... for my grace is sufficient for all men that humble themselves before me.", ref: "Ether 12:27" },
        pt: { text: "E se os homens vierem a mim, mostrar-lhes-ei sua fraqueza... porque minha graça basta a todos os homens que se humilham perante mim.", ref: "Éter 12:27" },
        fr: { text: "Et si les hommes viennent à moi, je leur montrerai leur faiblesse... car ma grâce suffit à tous les hommes qui nous s'humilient devant moi.", ref: "Éther 12:27" },
        it: { text: "E se gli uomini vengono a me, mostrerò loro la loro debolezza... poiché la mia grazia basta a tutti gli uomini che si umiliano dinanzi a me.", ref: "Ether 12:27" },
        de: { text: "Und wenn die Menschen zu mir kommen, zeige ich ihnen ihre Schwäche... denn meine Gnade ist ausreichend für alle Menschen, die sich vor mir demütigen.", ref: "Ether 12:27" }
    },
    {
        es: { text: "Sí, he aquí, te lo diré en tu mente y en tu corazón por medio del Espíritu Santo que vendrá sobre ti...", ref: "Doctrina y Convenios 8:2" },
        en: { text: "Yea, behold, I will tell you in your mind and in your heart, by the Holy Ghost, which shall come upon you...", ref: "Doctrine and Covenants 8:2" },
        pt: { text: "Sim, eis que eu te falarei em tua mente e em teu coração, pelo Espírito Santo que virá sobre ti...", ref: "Doutrina e Convênios 8:2" },
        fr: { text: "Oui, voici, je te le dirai dans ton esprit et dans ton cœur par le Saint-Esprit qui viendra sur toi...", ref: "Doctrine et Alliances 8:2" },
        it: { text: "Sì, ecco, io ti parlerò nella tua mente e nel tuo cuore mediante lo Spirito Santo, che verrà su di te...", ref: "Dottrina e Alleanze 8:2" },
        de: { text: "Ja, siehe, ich werde es dir in deinem Verstand und in deinem Herzen durch den Heiligen Geist sagen, der über dich kommen wird...", ref: "Lehre und Bündnisse 8:2" }
    },
    {
        es: { text: "Y ahora bien, como decía concerniente a la fe: La fe no es tener un conocimiento perfecto de las cosas...", ref: "Alma 32:21" },
        en: { text: "And now as I said concerning faith—faith is not to have a perfect knowledge of things...", ref: "Alma 32:21" },
        pt: { text: "E agora, como eu disse com respeito à fé — fé não é ter um perfeito conhecimento das coisas...", ref: "Alma 32:21" },
        fr: { text: "Et maintenant, comme je l'ai dit concernant la foi : la foi n'est pas d'avoir une connaissance parfaite des choses...", ref: "Alma 32:21" },
        it: { text: "E ora, come dicevo riguardo alla fede: la fede non è l'avere una conoscenza perfetta delle cose...", ref: "Alma 32:21" },
        de: { text: "Und nun, wie ich in Bezug auf den Glauben sagte: Glaube ist nicht, eine vollkommene Kenntnis der Dinge zu haben...", ref: "Alma 32:21" }
    },
    {
        es: { text: "Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito...", ref: "Juan 3:16" },
        en: { text: "For God so loved the world, that he gave his only begotten Son...", ref: "John 3:16" },
        pt: { text: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito...", ref: "João 3:16" },
        fr: { text: "Car Dieu a tant aimé le monde qu'il a donné son Fils unique...", ref: "Jean 3:16" },
        it: { text: "Poiché Iddio ha tanto amato il mondo, che ha dato il suo unigenito Figliuolo...", ref: "Giovanni 3:16" },
        de: { text: "Denn also hat Gott die Welt geliebt, dass er seinen eingeborenen Sohn gab...", ref: "Johannes 3:16" }
    },
    {
        es: { text: "Adán cayó para que los hombres existiesen; y existen los hombres para que tengan gozo.", ref: "2 Nefi 2:25" },
        en: { text: "Adam fell that men might be; and men are, that they might have joy.", ref: "2 Nephi 2:25" },
        pt: { text: "Adão caiu para que os homens existissem; e os homens existem para que tenham alegria.", ref: "2 Néfi 2:25" },
        fr: { text: "Adam tomba pour que les hommes fussent, et les hommes sont pour avoir la joie.", ref: "2 Néphi 2:25" },
        it: { text: "Adamo cadde affinché gli uomini potessero essere; e gli uomini sono affinché possano aver gioia.", ref: "2 Nefi 2:25" },
        de: { text: "Adam fiel, damit Menschen sein können, und Menschen sind, damit sie Freude haben können.", ref: "2 Nephi 2:25" }
    },
    {
        es: { text: "Iré y haré lo que el Señor ha mandado, porque sé que él nunca da mandamientos a los hijos de los hombres sin prepararles la vía...", ref: "1 Nefi 3:7" },
        en: { text: "I will go and do the things which the Lord hath commanded, for I know that the Lord giveth no commandments unto the children of men, save he shall prepare a way...", ref: "1 Nephi 3:7" },
        pt: { text: "Eu irei e cumprirei as ordens do Senhor, porque sei que o Senhor nunca dá ordens aos filhos dos homens sem antes preparar um caminho...", ref: "1 Néfi 3:7" },
        fr: { text: "J'irai et je ferai la chose que le Seigneur a commandée, car je sais que le Seigneur ne donne aucun commandement aux enfants des hommes sans leur préparer la voie...", ref: "1 Néphi 3:7" },
        it: { text: "Andrò e farò le cose che il Signore ha comandato, poiché so che il Signore non dà alcun comandamento ai figli degli uomini senza preparare loro una via...", ref: "1 Nefi 3:7" },
        de: { text: "Ich will hingehen und das tun, was der Herr geboten hat; denn ich weiß, der Herr gibt den Menschenkindern keine Gebote, ohne ihnen einen Weg zu bereiten...", ref: "1 Nephi 3:7" }
    },
    {
        es: { text: "Mira que te mando que te esfuerces y seas valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo...", ref: "Josué 1:9" },
        en: { text: "Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the Lord thy God is with thee...", ref: "Joshua 1:9" },
        pt: { text: "Não to mandei eu? Esforça-te, e tem bom ânimo; não temas, nem te espantes; porque o Senhor teu Deus é contigo...", ref: "Josué 1:9" },
        fr: { text: "Ne t'ai-je pas donné cet ordre : Fortifie-toi et prends courage ? Ne t'effraie point et ne t'épouvante point, car l'Éternel, ton Dieu, est avec toi...", ref: "Josué 1:9" },
        it: { text: "Non te l'ho io comandato? Sii forte e coraggioso; non ti spaventare e non ti sgomentare, perché l'Eterno, il tuo Dio, sarà con te...", ref: "Giosuè 1:9" },
        de: { text: "Habe ich dir nicht geboten: Sei mutig und stark? Fürchte dich also nicht, und hab keine Angst; denn der Herr, dein Gott, ist mit dir...", ref: "Josua 1:9" }
    },
    {
        es: { text: "Porque, he aquí, esta es mi obra y mi gloria: Llevar a cabo la inmortalidad y la vida eterna del hombre.", ref: "Moisés 1:39" },
        en: { text: "For behold, this is my work and my glory—to bring to pass the immortality and eternal life of man.", ref: "Moses 1:39" },
        pt: { text: "Pois eis que esta é minha obra e minha glória: Levar a efeito a imortalidade e vida eterna do homem.", ref: "Moisés 1:39" },
        fr: { text: "Car voici mon œuvre et ma gloire : réaliser l'immortalité et la vie éternelle de l'homme.", ref: "Moïse 1:39" },
        it: { text: "Poiché ecco, questa è la mia opera e la mia gloria: fare avverare l'immortalità e la vita eterna dell'uomo.", ref: "Mosè 1:39" },
        de: { text: "Denn siehe, das ist mein Werk und meine Herrlichkeit—die Unsterblichkeit und das ewige Leben des Menschen zuwege zu bringen.", ref: "Mose 1:39" }
    },
    {
        es: { text: "Venid a mí todos los que estáis trabajados y cargados, y yo os haré descansar.", ref: "Mateo 11:28" },
        en: { text: "Come unto me, all ye that labour and are heavy laden, and I will give you rest.", ref: "Matthew 11:28" },
        pt: { text: "Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei.", ref: "Mateus 11:28" },
        fr: { text: "Venez à moi, vous tous qui êtes fatigués et chargés, et je vous donnerai du repos.", ref: "Matthieu 11:28" },
        it: { text: "Venite a me, voi tutti che siete travagliati ed aggravati, e io vi darò riposo.", ref: "Matteo 11:28" },
        de: { text: "Kommt her zu mir, alle, die ihr mühselig und beladen seid; ich will euch erquicken.", ref: "Matthäus 11:28" }
    },
    {
        es: { text: "Todo lo puedo en Cristo que me fortalece.", ref: "Filipenses 4:13" },
        en: { text: "I can do all things through Christ which strengtheneth me.", ref: "Philippians 4:13" },
        pt: { text: "Posso todas as coisas em Cristo que me fortalece.", ref: "Filipenses 4:13" },
        fr: { text: "Je puis tout par celui qui me fortifie.", ref: "Philippiens 4:13" },
        it: { text: "Io posso ogni cosa in Colui che mi fortifica.", ref: "Filippesi 4:13" },
        de: { text: "Ich vermag alles durch den, der mich mächtig macht.", ref: "Philipper 4:13" }
    },
    {
        es: { text: "Si alguno de vosotros tiene falta de sabiduría, pídala a Dios, el cual da a todos abundantemente...", ref: "Santiago 1:5" },
        en: { text: "If any of you lack wisdom, let him ask of God, that giveth to all men liberally...", ref: "James 1:5" },
        pt: { text: "E, se algum de vós tem falta de sabedoria, peça-a a Deus, que a todos dá liberalmente...", ref: "Tiago 1:5" },
        fr: { text: "Si quelqu'un d'entre vous manque de sagesse, qu'il la demande à Dieu, qui donne à tous simplement...", ref: "Jacques 1:5" },
        it: { text: "Che se alcuno di voi manca di sapienza, la chiegga a Dio che dona a tutti liberalmente...", ref: "Giacomo 1:5" },
        de: { text: "Fehlt es aber einem von euch an Weisheit, dann soll er sie von Gott erbitten; Gott wird sie ihm geben...", ref: "Jakobus 1:5" }
    },
    {
        es: { text: "Por medio de cosas pequeñas y sencillas se realizan grandes cosas.", ref: "Alma 37:6" },
        en: { text: "By small and simple things are great things brought to pass.", ref: "Alma 37:6" },
        pt: { text: "Por meio de coisas pequenas e simples as grandes são realizadas.", ref: "Alma 37:6" },
        fr: { text: "C'est par des choses petites et simples que de grandes choses sont réalisées.", ref: "Alma 37:6" },
        it: { text: "Mediante cose piccole e semplici si avverano grandi cose.", ref: "Alma 37:6" },
        de: { text: "Durch Kleines und Einfaches wird Großes zuwege gebracht.", ref: "Alma 37:6" }
    },
    {
        es: { text: "Si me amáis, guardad mis mandamientos.", ref: "Juan 14:15" },
        en: { text: "If ye love me, keep my commandments.", ref: "John 14:15" },
        pt: { text: "Se me amais, guardai os meus mandamentos.", ref: "João 14:15" },
        fr: { text: "Si vous m'aimez, gardez mes commandements.", ref: "Jean 14:15" },
        it: { text: "Se mi amate, osserverete i miei comandamenti.", ref: "Giovanni 14:15" },
        de: { text: "Liebt ihr mich, so werdet ihr meine Gebote halten.", ref: "Johannes 14:15" }
    }
];
