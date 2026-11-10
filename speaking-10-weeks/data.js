/* 10-Week IELTS Speaking Plan – content
 * Based on the IELTS Speaking Forecast Q3/2026.
 *
 * Format
 *  p1 group : {id, title, from, q:[[required, similar, similar…], …], o:[other questions]}
 *  story    : {id, title, hint, p2:[cue card, bullet, bullet…], p3:[[required, similar…], …],
 *              v:[[same-story topic, 'bullets · bullets'], …], o:[other Part 3 questions]}
 *  mock     : {id, p1:[{title, from, q:[…]}], p2:[cue card, bullets…], reuse:'story id', p3:[…]}
 * Codes (W1-A-01, W1-A-01-s1, W1-A-o1, W1-S1-P2, W1-S1-P3-01, W1-S1-V1, W1-S1-o1…) are generated automatically.
 */
const PLAN = {
  title: '10-Week IELTS Speaking Plan',
  subtitle: 'Based on the IELTS Speaking Forecast Q3/2026 · Goal: speak with more confidence (no band target)',
  rescue: [
    'Let me think…',
    'That’s an interesting question. I’ve never really thought about it, but I guess…',
    'Could you repeat the question, please?',
    'What I mean is…',
    'I’m not sure, but I’d say…',
  ],
  rhythm: [
    '20–30 minutes a day, 5 days a week: a 5-minute warm-up (read aloud or shadow a model answer), then a few required Part 1 questions, then the ★ Part 2 topic or a few Part 3 questions.',
    'Weekend: one mock test of about 12 minutes. A teacher or parent asks like an examiner, using both required and similar questions, so you can see that you can answer them. Take one full day off.',
    'Don’t memorise model answers. Take only the ideas and vocabulary, then say it in your own words.',
    'Measure progress by how long and how smoothly you speak, not by band score. Each week, watch out for just one mistake you often repeat (e.g. subject–verb agreement, articles).',
  ],
};

const WEEKS = [
/* ================================================================ WEEK 1 */
{
  n: 1, title: 'Warm-up: you & where you live',
  focus: 'Answer Part 1 in 2–3 sentences (Answer – Reason – Small example). Learn the 5 rescue phrases by heart. Just record – don’t correct mistakes yet.',
  p1: [
    { id: 'W1-A', title: 'Studies', from: 'Work or studies (Study part), Secondary school, Teachers',
      q: [
        ['What subjects are you studying?', 'Do you like your subject?', 'Do you think that your subject is popular in your country?'],
        ['Why did you choose to study that subject?', 'Do you want to change your major?'],
        ['Do you have any plans for your studies in the next five years?'],
        ['How much time do you spend on your studies each week?', 'Do you prefer to study in the mornings or in the afternoons?', 'What technology do you use when you study?'],
        ['What was your favourite subject at secondary school?', 'Were there any subjects that you found difficult at secondary school?', 'Is there anything you miss about your secondary school?'],
        ['Do you have a favorite teacher?', 'In what way has your favourite teacher helped you?', 'Do you have a teacher from your past that you still remember?', 'Are you still in touch with your primary school teachers?'],
      ],
      o: ['What are the benefits of being your age?', 'What changes would you like to see in your school?', 'Do you remember your first day at secondary school?', 'Do you want to be a teacher in the future?'] },
    { id: 'W1-B', title: 'Where you live: home, hometown, neighbourhood, city', from: 'Home & Accommodation, Hometown, The area you live in, The city you live in',
      q: [
        ['Who do you live with?', 'Do you live in an apartment or a house?', 'What kinds of accommodation do you live in?'],
        ['Can you describe the place where you live?', 'Please describe the room you live in.', 'What part of your home do you like the most?', 'What’s your favorite room in your apartment or house?', 'What makes you feel pleasant in your home?'],
        ['How long have you lived there?', 'How long have you been living there?', 'How long have you lived in this city?', 'Do you plan to live there for a long time?', 'Is this city your permanent residence?'],
        ['Please describe your hometown a little.', 'Is that a big city or a small place?', 'What city do you live in?', 'What’s your hometown famous for?'],
        ['What do you like (most) about your hometown?', 'Do you like your hometown?', 'Do you like living there?', 'Do you like this city? Why?', 'Do you like the area that you live in?', 'Would you recommend your city to others?'],
        ['Are the people in your neighborhood nice and friendly?', 'Are the people friendly in the city?', 'Do you know any of your neighbours?', 'Do you often see your neighbors?'],
        ['Are there big changes in this city?', 'What are some changes in the area recently?', 'What’s the difference between where you are living now and where you have lived in the past?'],
        ['What kind of house or apartment do you want to live in in the future?', 'Do you prefer living in a house or an apartment?'],
      ],
      o: ['What room does your family spend most of the time in?', 'What do you usually do in your apartment?', 'Do you think it is important to live in a comfortable environment?', 'Have you learned anything about the history of your hometown?', 'Did you learn about the culture of your hometown in your childhood?', 'Is there anything you dislike about it?', 'Did you learn about the history of your hometown at school?', 'Are there many young people in your hometown?', 'Do you live in a noisy or a quiet area?', 'Where do you like to go in that area?', 'Do you know any famous people in your area?', 'What’s the weather like where you live?', 'Are there people of different ages living in this city?', 'Is the city friendly to children and old people?'] },
  ],
  stories: [
    { id: 'W1-S1', title: 'A natural place near your home',
      hint: 'Pick one real place you often go to (a park, a beach, a lake…).',
      p2: ['Describe a natural place in your city that you enjoy visiting', 'Where it is', 'What it is like', 'How often you go there', 'Who you often go there with', 'And explain why you enjoy visiting there'],
      p3: [
        ['Do you think there should be many natural places in cities?'],
        ['Do you think staying in a natural place would help change people’s mood?'],
        ['Are rivers and lakes important to a country?', 'How can rivers and lakes benefit local people?', 'Do you think rivers and lakes attract tourists?', 'How do rivers and lakes affect local tourism?'],
        ['Why do you think some people choose not to travel abroad?'],
      ],
      v: [
        ['Describe a place you would like to visit in your free time', 'Where it is · What you will do there · How long you will stay there · And explain why you would like to visit it'],
        ['Describe an important river/lake in your country', 'Where it is located · How big/long it is · What it looks like · And explain why it is important'],
      ],
      o: ['Which is more important, protecting the environment or developing the economy?', 'Do you think a gap period in life is important?', 'What are the popular water sports in your country?', 'Are rivers and lakes good for transport? Why?'] },
  ],
},
/* ================================================================ WEEK 2 */
{
  n: 2, title: 'Routines & places',
  focus: 'Learn to make Part 2 notes in 1 minute (4–5 keywords). Speaking for 1 minute 30 seconds is a pass.',
  p1: [
    { id: 'W2-A', title: 'Your day', from: 'Morning routines, Evening time, Tiredness, Feeling bored',
      q: [
        ['What is your morning routine?', 'What do you do right after getting up in the morning?', 'Do you like to get up early in the morning?', 'Is breakfast important?'],
        ['What do you usually do in the evening?', 'Do you spend your evenings doing the same things on both weekends and weekdays? Why?', 'What do you hate doing in the evening?'],
        ['Do you like the morning or evening?'],
        ['Are there any differences between what you do in the evening now and what you did in the past?', 'What did you do in the evening when you were little? Why?'],
        ['When would you feel tired?', 'Do you often feel tired?', 'Do you often feel bored?', 'When would you feel bored?'],
        ['What do you do when you feel tired?', 'What do you do when you feel bored?'],
      ],
      o: ['Do you think childhood is boring or adulthood is boring?'] },
    { id: 'W2-B', title: 'Parks & old buildings', from: 'Public gardens and parks, Old buildings',
      q: [
        ['Do you still like going to parks now?', 'Did you like going to parks as a child?', 'Would you like to play in a public garden or park?', 'Would you prefer to play in a personal garden or public garden?'],
        ['What do you like to do when visiting a park?'],
        ['How are the parks today different from those you visited as a kid?'],
        ['Would you like to see more parks in your city?', 'Are there any parks you want to go to in the future?'],
        ['Do you think we should preserve old buildings in cities?', 'Have you ever seen old buildings in the city?', 'Are there any old buildings you want to see in the future? Why?'],
        ['Do you prefer living in an old building or a modern house?'],
      ],
      o: [] },
  ],
  stories: [
    { id: 'W2-S1', title: 'A trip',
      hint: 'Pick one city you have visited and liked.',
      p2: ['Describe a place you have travelled to that you would like to recommend to others', 'What it is', 'Where it is', 'What you saw and did there', 'And explain why you would like to recommend it to others'],
      p3: [
        ['Where do people in your country often go for holidays?'],
        ['Is it important to plan a holiday?', 'How do people usually plan holidays?'],
        ['What is the ideal length for a holiday?'],
        ['What’s the difference between the city and the countryside?', 'Do you think people in the countryside are friendlier than people in the city?'],
      ],
      v: [
        ['Describe a city that you have been to and would like to visit again', 'When you visited it · What you did there · What it was like · And explain why you would like to visit it again'],
      ],
      o: ['Some people say large cities are suitable for old people. What do you think?', 'Do you think it is possible that all of the population move to cities?', 'Are there any changes in your city?', 'What should the government do to improve citizens’ safety?'] },
    { id: 'W2-S2', title: 'A crowded, noisy place',
      hint: 'Pick one market, shopping mall or busy street.',
      p2: ['Describe a crowded place you went to', 'Where it was', 'When you went there', 'Who you went there with', 'What you did there', 'And how you felt about it'],
      p3: [
        ['Why do people go to crowded places?', 'Do you think there are some people who enjoy crowded places?'],
        ['What kinds of noises are there in our life?', 'Which area is exposed to noise more, the city or the countryside?'],
        ['Do you think it is good for children to make noise?', 'Should children not be allowed to make noise under any circumstances?'],
        ['Are there many tall buildings in your country?', 'Which cities are overcrowded in your country?', 'Do you think it is a good trend to have more big cities?'],
      ],
      v: [
        ['Describe a noisy place you have been to', 'Where it is · When you went there · What you did there · And explain why you feel it’s a noisy place'],
        ['Describe a boring place', 'Where it is · Who you went there with · What you did there · And explain why you think it is a boring place'],
        ['Describe a tall building you like or dislike', 'What it is used for · Where it is · What it looks like · And explain why you like/dislike it'],
      ],
      o: ['Will there be more or less green space in cities in the future?', 'Will people use bikes more or less in cities in the future?', 'How would people usually respond to noises in your country?', 'How can people consider others’ feelings when chatting in public?', 'Why do most children think education is boring?', 'Why aren’t young people willing to listen to the experiences of older people?', 'What can people do when they feel bored?', 'Why are some teachers’ classes boring? Are there any solutions?', 'What are the differences between those tall buildings in your country?', 'Why are different places laid out and designed differently?'] },
  ],
},
/* ================================================================ WEEK 3 */
{
  n: 3, title: 'An older person',
  focus: 'Understand “one person, many topics”: prepare one person carefully, then turn that story to fit other topics. Speak for the full 2 minutes.',
  p1: [
    { id: 'W3-A', title: 'Politeness & names', from: 'Politeness, Name',
      q: [
        ['How did you learn to be polite as a child?'],
        ['Do you think being polite is very important?'],
        ['Is it easy for you to remember people’s names?', 'Do you often forget people’s names?'],
        ['How do you remember people’s names?'],
        ['How do you feel when people can’t remember your name?'],
      ],
      o: [] },
    { id: 'W3-B', title: 'Art, crafts & music', from: 'Art, Paper, Singing, Music',
      q: [
        ['Do you like art?', 'Do you like modern art or traditional art?', 'Do you like visiting art galleries?'],
        ['Have you made any crafts with paper?', 'What did you like to do with paper as a child?'],
        ['Do you still write physical letters?', 'Do people still keep handwritten letters today?'],
        ['Do you like singing? Why?', 'Have you ever learnt how to sing?', 'Who do you want to sing for?'],
        ['Do you prefer sad or happy music?', 'Does happy music make you feel more excited?', 'Do you think singing can bring happiness to people?'],
      ],
      o: ['Do you want to be an artist?', 'Do you carry paper and pens with you when you go out?'] },
  ],
  stories: [
    { id: 'W3-S1', title: 'An older person (grandparent, aunt/uncle, teacher)',
      hint: 'Pick one real person. Note down: who they are, their personality, their hobbies (growing plants, making things by hand, loving history…) and one memory you share.',
      p2: ['Describe someone who is older than you that you admire', 'Who this person is', 'How you knew this person', 'What kinds of things you like to do together', 'And explain how you feel about this person'],
      p3: [
        ['What can young and old people learn from each other?', 'Why is there a generation gap between the young and the old?'],
        ['What do old people usually do in their daily life?', 'Has old people’s life quality improved when compared to the past?'],
        ['Why do some people like to grow plants?', 'What are the advantages of growing vegetables or flowers at home?', 'Why do some people prefer to grow their own fruits and vegetables instead of buying them from the market?'],
        ['Why should children learn new skills?', 'Where can children learn new skills?', 'How can parents and teachers teach children new skills?'],
      ],
      v: [
        ['Describe a person who taught you a new skill', 'Who this person was · What the skill was · How you learned it · And explain how you felt about this person'],
        ['Describe a person who loves to grow plants (e.g. vegetables, flowers) at home or in the garden', 'Who this person is · What plants he/she grows · How he/she grows the plants · And explain why he/she loves growing plants'],
        ['Describe a person who is good at making things by hand', 'Who this person is · What he/she makes · What materials or technologies he/she uses · And why you think this person is good at making things by hand'],
        ['Describe a happy person you know', 'Who this person is · What he/she is like · How he/she shows happiness · And explain why you think he/she is a happy person'],
        ['Describe a person you know who is very organized', 'Who this person is · What this person usually does to stay organized · In what situations you have noticed this quality · And explain why you think being organized is important to him/her'],
        ['Describe a person who learns history and loves history', 'Who this person is · How he/she learns history · Why he/she loves history · And explain how you feel about him/her'],
        ['Describe a home that you like to visit but do not want to live in', 'Where it is · What it is like · Why you like to visit it · And explain why you would not like to live there'],
      ],
      o: ['How do adults learn a new skill?', 'What are the differences between learning from a teacher and learning by oneself?', 'Why is self-discipline important when learning a new skill?', 'Do many people grow vegetables or flowers at home in your country?', 'Is it easy to grow plants at home?', 'Do you think art classes are important for children?', 'Why do some children enjoy making things by hand?', 'Do children these days still like doing arts and crafts?', 'What impact can artistic buildings have on society?', 'Is it good to have creative people in a team?', 'Does art, like music or theater, have an impact on society?', 'Should teachers know what children are doing all the time?', 'Do you think teachers are able to spot the unhappy children?', 'How can the arts spread positive emotions in society?', 'When do you think people are happiest?', 'Why is it important for people to be organized?', 'Do you think children should learn to be organized from a young age?', 'Are organized people more likely to be successful at work or in their studies?', 'What can people do to become more organized?', 'Should parents teach their children to be organized?', 'Do you think children should begin learning history from an early age?', 'At what age do you think people should begin to learn history?', 'How do children learn history before they attend school?', 'Is it important to learn how people in the past lived their lives?', 'Do you think people should learn ancient history before learning modern history?', 'Besides big historical events, what else is important when learning history?', 'Do Vietnamese people like to visit others’ homes?', 'What do Vietnamese people do when they visit others?', 'What kind of place do people in your country like to live in?', 'What’s the difference between homes in cities and those in the countryside?'] },
  ],
},
/* ================================================================ WEEK 4 */
{
  n: 4, title: 'Friends & famous people',
  focus: 'Part 3: answer with Answer – Reason – Example.',
  p1: [
    { id: 'W4-A', title: 'Internet, ads & devices', from: 'Social media, Websites, Advertisement, Computers/tablets, Headphones',
      q: [
        ['Do you think you spend too much time on social media?', 'Have you ever posted anything on social media?', 'When did you start using social media?', 'Do your friends use social media?'],
        ['What kinds of websites do you often visit?', 'What is your favourite website?', 'What kinds of websites are popular in your country?'],
        ['Do you like advertisements?', 'What kind of advertising do you like?', 'Do you often see advertisements when you are on your phone or computer?'],
        ['Is there an advertisement that made an impression on you when you were a child?'],
        ['In what conditions would you use a computer or tablet?', 'Would you like to use a computer or tablet?', 'When was the first time you used a computer or tablet?'],
        ['When would you use headphones?', 'Do you use headphones?', 'What type of headphones do you use?', 'In what conditions would you not use headphones?'],
      ],
      o: ['What do people often do on social media?', 'Are there any changes to the websites you often visit?', 'Do you see a lot of advertising on trains or other transport?', 'What would your life be like without computers or tablets?', 'In what conditions would it be difficult for you to use a computer or tablet?'] },
    { id: 'W4-B', title: 'Clothes & accessories', from: 'Clothing, Shoes, Watch, Mirrors',
      q: [
        ['What kind of clothes do you like to wear?', 'Do you like wearing T-shirts?', 'Do you prefer to wear comfortable and casual clothes or smart clothes?', 'Which do you prefer, fashionable shoes or comfortable shoes?'],
        ['Do you spend a lot of time choosing clothes?'],
        ['Do you like buying shoes? How often?', 'Have you ever bought shoes online?', 'How much money do you usually spend on shoes?'],
        ['Do you wear a watch?', 'Do you think it is important to wear a watch? Why?', 'Have you ever got a watch as a gift?'],
        ['Why do some people wear expensive watches?'],
        ['Do you like looking at yourself in the mirror? How often?', 'Do you usually take a mirror with you?', 'Have you ever bought mirrors?', 'Would you use mirrors to decorate your room?'],
      ],
      o: [] },
  ],
  stories: [
    { id: 'W4-S1', title: 'A friend',
      hint: 'Pick one close friend. You can give them extra hobbies: taking photos, being good at languages, wanting to be a doctor…',
      p2: ['Describe a friend from your childhood', 'Who he/she is', 'Where and how you met each other', 'What you often did together', 'And explain what made you like him/her'],
      p3: [
        ['Do you still keep in touch with your friends from childhood? Why or why not?', 'How important is childhood friendship to children?'],
        ['Do you think online communication through social media will replace face-to-face communication?', 'What do you think of communicating via social media?', 'Has technology changed people’s friendships? How?'],
        ['How do people make friends in Vietnam?', 'On what occasions do people like to make friends?', 'Is it important to have the same hobbies and interests when making friends?', 'What qualities make true friends?'],
        ['Why are some people keen on taking photos?', 'What kind of photos do people often take?', 'Why do tourists like taking photos while they are travelling?'],
      ],
      v: [
        ['Describe a person you know who really likes taking photos', 'Who the person is · When and how you got to know him/her · Where he/she takes photos · And explain how you feel about him/her'],
        ['Describe a person who is good at learning and speaking new languages', 'How you got to know him/her · How he/she learns a new language · And explain how you feel about him/her · What languages he/she can speak'],
        ['Describe a person you know who would like to choose a career in the medical field (e.g. a doctor, a nurse)', 'When you knew him/her · When he/she started to think about that · What he/she would like to do · And explain why he/she would like to choose this career'],
        ['Describe a person you only met once recently and want to know more about', 'Who he/she is · When you met him/her · Why you want to know more about him/her · And explain how you feel about him/her'],
      ],
      o: ['What’s the difference between having younger friends and older friends?', 'Do you think it’s ok to take photos everywhere?', 'Some people don’t mind others walking into their shot when they’re taking photos. What do you think?', 'Are there many people who can speak foreign languages in your country?', 'Do people learn any languages other than English?', 'Why is it easier for children to learn new things than for adults?', 'How do people learn new things?', 'Do you think being a doctor is easy or difficult?', 'Do you think learning biology is interesting for children?', 'What can we do to leave a good impression on people we meet for the first time?', 'What should we not talk about when we meet a person for the first time?'] },
    { id: 'W4-S2', title: 'A famous person',
      hint: 'Pick one famous person you know well (a singer, a footballer, a YouTuber…).',
      p2: ['Describe a famous person in your local area', 'Who this person is', 'What he/she has done', 'Why he/she is popular', 'And explain how you feel about this person'],
      p3: [
        ['Why are some students popular?', 'Is it always good to be a popular student at school?'],
        ['What kinds of people are frequently interviewed?', 'What kinds of things do famous people often say in an interview?'],
        ['Why are many advertisements endorsed by celebrities? How useful are they?'],
        ['What are the advantages and disadvantages of advertisements?', 'What is the most important factor in an advertisement?', 'Why are some advertisements boring?'],
      ],
      v: [
        ['Describe a time you watched a famous person being interviewed', 'Who the famous person was · What the interview was about · When and where you watched the interview · And explain how you felt about the interview'],
        ['Describe an advertisement with a famous person in it', 'Who the person is · Where you can see it · What the advertisement is about · And explain how you feel about the advertisement'],
      ],
      o: ['Which is more effective, online advertising or offline advertising?'] },
  ],
},
/* ================================================================ WEEK 5 */
{
  n: 5, title: 'Study & decisions',
  focus: 'Correct yourself while speaking (“sorry, I mean…”) and keep going – don’t stop.',
  p1: [
    { id: 'W5-A', title: 'Science, history & space', from: 'Science, History, Outer space and stars',
      q: [
        ['Do you like science?', 'Which science subject is interesting to you?', 'When did you start to learn about science?'],
        ['What kinds of interesting things have you done with science?'],
        ['Do you like watching science TV programs?', 'Do you like science fiction movies? Why?'],
        ['Do you like history?', 'Did you like history when you were young?', 'When was the last time you read about history?'],
        ['Have you ever been to historical museums?', 'Do Vietnamese people often visit science museums?'],
        ['Do you want to know more about outer space?', 'Have you ever learnt about outer space and stars?', 'Do you want to go into outer space in the future?'],
      ],
      o: [] },
    { id: 'W5-B', title: 'Dreams', from: 'Dream and ambition',
      q: [
        ['What was your childhood dream?', 'What is your dream job?'],
        ['Do you think you are an ambitious person?', 'Are you the kind of person who sticks to dreams?'],
      ],
      o: [] },
  ],
  stories: [
    { id: 'W5-S1', title: 'Studying',
      hint: 'Pick one course or class (e.g. your IELTS class).',
      p2: ['Describe a course that impressed you a lot', 'What the course was about', 'Where you took the course', 'What you did during the course', 'And explain why it impressed you a lot'],
      p3: [
        ['What’s the best way to learn a language?', 'Which is better, to study a language alone or to study it in a group? Why?'],
        ['What difficulties do people face when learning a language?'],
        ['Do you think it is easier for children to learn new skills than for adults?', 'What are the differences between the way adults learn and the way children learn?'],
        ['Should students learn to do group work?', 'What group tasks are there in schools?', 'What are the differences between learning in a group and learning by yourself?'],
      ],
      v: [
        ['Describe a new skill you learned when you were a child', 'What the skill was · Who taught you this skill · How you learned it · And explain how you felt about learning the skill'],
        ['Describe a thing you did to learn another language', 'What language you learned · What you did · How it helped you learn the language · And how you felt about it'],
        ['Describe a time when you worked in a group', 'What you did · Who you worked with · What problems you faced · And explain why you worked in the group'],
        ['Describe a time when someone talked about something you were not interested in but you kept listening', 'Who the person was · What he/she talked about · Why you kept listening · And explain how you felt about the experience'],
      ],
      o: ['What do people need to remember in their daily lives?', 'What can we learn from history?', 'Why do some people have a better memory than others?', 'Do people like things of memorial significance?', 'Which can help people remember things better, words or photos?', 'Can technology help people remember things better? How?', 'What skills should children learn before they go to school?', 'Can a child learn skills from another child?', 'Is it important for everyone to have a specialized skill?', 'What are the advantages and disadvantages of learning a language?', 'Some people think that technology has made it unnecessary to learn languages. What do you think?', 'Do you think language learning is important? Why?', 'Why do some people prefer to work by themselves?', 'What should a leader do to make team members want to follow him or her?', 'What kind of topics do young people like to talk about today?', 'What would happen if the listener didn’t listen carefully?', 'How can we tell if a listener is listening carefully?'] },
    { id: 'W5-S2', title: 'A decision / a change',
      hint: 'Pick one real decision (choosing a school, deciding to study IELTS, changing a habit…).',
      p2: ['Describe an important decision that you made', 'What the decision was', 'How you made your decision', 'What the results of the decision were', 'And explain why it was important'],
      p3: [
        ['How do people usually make important decisions?', 'Who can children turn to for help when making a decision?'],
        ['Which is better, to make a decision quickly or slowly?', 'How can we tell the difference between an important and an easy decision?'],
        ['Do you think children sometimes have to make important decisions?', 'When do most children begin to make their own decisions?', 'When do most children begin to have their own opinions?'],
        ['Do you think it is good to change one’s daily routine?', 'Who tend to change their daily routine more, young people or old people?', 'Do people often change their plans?'],
      ],
      v: [
        ['Describe a time you made an important decision and were happy with the result', 'What the decision was · Why you made the decision · How easy it was for you to make the decision · And explain why you were happy with the result'],
        ['Describe a time when you changed an important decision of yours', 'When you changed the decision · What the original decision was · Why you changed it · And explain how you felt about the experience'],
        ['Describe a time when you changed an important opinion of yours', 'When you changed your opinion · What the original opinion was · Why you changed it · And explain how you felt about the experience'],
        ['Describe a change that you made recently', 'What the change was · What caused the change · What you did for the change · And explain how you feel about the change'],
        ['Describe a plan that you had to change recently', 'When this happened · What made you change the plan · What the new plan was · And how you felt about the change'],
      ],
      o: ['What important decisions do teenagers need to make after graduation?', 'Do you think advertisements can influence our decisions when shopping?', 'Do you think the influence of advertising is good?', 'Do you think it is a good idea to make a small decision every day?', 'What little decisions do people make every day?', 'What if people in a group have different opinions on a decision?', 'Do you think most of people’s decisions are made in their 20s?', 'Whose opinions are more important to children, their parents’ or teachers’?', 'Do children communicate more with teachers or with parents?', 'Who do young people like to share opinions with?', 'Do people often make plans around their regular routines?', 'Would you tell others if you change your plan?', 'Why do you think parents still make plans for their children nowadays?', 'How does technology help people make plans?'] },
  ],
},
/* ================================================================ WEEK 6 */
{
  n: 6, title: 'Shopping & unlucky days',
  focus: 'Tell stories in the past tense smoothly.',
  p1: [
    { id: 'W6-A', title: 'Shopping, fruit & vegetables', from: 'Shopping, Street market, Fruit and vegetables',
      q: [
        ['Do you like shopping?', 'How often do you go shopping?'],
        ['Do you prefer online shopping or in-store shopping?', 'Have you ever returned anything you bought online?', 'Do you prefer to go shopping in the shopping mall or on the street market?'],
        ['What do people usually buy on the street market?', 'When was the last time you went to a street market?', 'Are there many street markets in Vietnam?'],
        ['How often do you eat fruit and vegetables?', 'Where do you usually buy fruit and vegetables?'],
        ['What kind of fruits and vegetables do you dislike?', 'Were there any kinds of fruits and vegetables you disliked as a child?'],
      ],
      o: [] },
    { id: 'W6-B', title: 'Your things: lost, collected, tidy', from: 'Lost and found, Collecting things, Tidiness',
      q: [
        ['Have you ever lost things?', 'Have you ever lost your keys?', 'Will you post on social media if you lose your item?'],
        ['What will you do if you find something lost by others?', 'Do you report to the police when finding something lost by others? Why?'],
        ['Do you collect things?', 'Are there any things you have kept from your childhood?', 'Would you keep old things for a long time? Why?'],
        ['Do you like to keep things tidy?', 'Did you use to keep your room tidy as a child?', 'Where do you usually keep things you need?'],
      ],
      o: [] },
  ],
  stories: [
    { id: 'W6-S1', title: 'Shopping, gifts & food',
      hint: 'Pick one time you saved money to buy something or a gift, and one food for a special occasion (Tet, a birthday).',
      p2: ['Describe a time when you saved money to buy something special', 'What the special thing was', 'Why you wanted to buy it', 'How you saved money for it', 'And explain how you felt after buying it'],
      p3: [
        ['Is it easier to spend money or save money?', 'What kind of things do people usually save money for?'],
        ['Should schools teach children how to manage money from a young age?', 'Should parents teach their children to spend money freely or to save money?'],
        ['What are the differences between online shopping and in-store shopping?', 'What are the advantages and disadvantages of shopping online?'],
        ['What do people usually consider when buying gifts?', 'When do people normally send gifts to others?', 'Is it hard to choose a gift?'],
      ],
      v: [
        ['Describe a time when you received good service in a shop/store', 'Where the shop is · When you went to the shop · What service you received from the staff · And explain how you felt about the service'],
        ['Describe a gift you would like to buy for your friend', 'How you knew your friend · How long you have known him/her · How you would choose a gift for him/her · And explain why you would choose that gift for him/her'],
        ['Describe a special cake you received from others', 'When it happened · Where it happened · Who you got the cake from · And explain why it’s a special cake'],
        ['Describe a food that people eat on special occasions/events', 'What it is · What the special event/occasion is · How it is cooked/made · And explain why people eat it on that special occasion/event'],
      ],
      o: ['Do you think it is easier to teach teenagers how to manage money when they are around 16 or 17 years old?', 'Should people spend time on charity, or just money?', 'Why are shopping malls so popular in Vietnam?', 'What are the advantages and disadvantages of shopping in small shops?', 'Why do some people not like shopping in small shops?', 'Can consumption drive economic growth?', 'Will people feel happy when receiving an expensive gift?', 'Which do people give on traditional festivals, red envelopes or other kinds of gifts?', 'Are there any unlucky things that people should not buy as gifts in your country?', 'In your country, do people nowadays cook at home as frequently as people did in the past?', 'What do you think of people using their mobile phones during a meal?', 'What are the differences between special food in Vietnam and other countries?', 'Is there any food in your country that is eaten at special times or on special occasions?', 'Why are some people willing to spend a lot of money on meals on special days?', 'Do you think it’s good to communicate when eating with your family?', 'Why are there special foods on special occasions or events?', 'What are the differences between everyday food and festival food?', 'Are there any differences between the food people eat today and the food people ate in the past?'] },
    { id: 'W6-S2', title: 'An unlucky day',
      hint: 'Pick one real “unlucky” day: losing something, a traffic jam, a broken phone… You can put several details into the same day.',
      p2: ['Describe an occasion that you lost something in public', 'What you lost', 'When and where you lost it', 'What you did to find it', 'And explain how you felt about it'],
      p3: [
        ['What can we do to reduce the possibility of losing things?', 'What kinds of things do people usually lose?', 'What will people do when losing things?'],
        ['How can we solve the traffic jam problem?', 'Do you think developing public transport can solve traffic jam problems?', 'What are good ways to manage traffic?'],
        ['Why do some people prefer sending a message instead of making a call?', 'In what situations do people spend a long time responding to others’ messages?'],
        ['Do you think students are overly reliant on AI?', 'What can teachers do to stop students from relying too much on AI?', 'Should children learn to use AI?'],
      ],
      v: [
        ['Describe a time when you were stuck in a traffic jam for a very long time', 'When it happened · Where you were stuck · What you did while waiting · And explain how you felt in the traffic jam'],
        ['Describe a time when you sent a message or an email to someone but received no reply for a long time', 'Who you sent it to · What the message/email was about · Whether you finally received the reply · And explain how you felt about the experience'],
        ['Describe a challenging technological problem you faced', 'What the problem was · When and where you faced it · How challenging it was · And explain how you solved it'],
        ['Describe a time when you got up early', 'When it was · What you did · Why you got up early · And how you felt about it'],
        ['Describe a short trip you often take but do not like', 'Where you go · When you go there · Why you go there · And explain why you do not like the trip'],
      ],
      o: ['Is it effective to offer rewards to find lost things?', 'What kinds of people may lose things often?', 'What do people often feel after losing things?', 'Do you like to use public transport?', 'Would you rather be in a car or a bus in a traffic jam?', 'Do you think the high ways will help reduce traffic jams?', 'In what situations do people not respond to messages at all?', 'What would you do if you did not receive a reply after sending out a message?', 'How do you show your respect in your messages?', 'Why do some people feel angry when others don’t reply to their message?', 'What are the advantages and disadvantages of AI?', 'Do you think people today should learn about AI technology?', 'How can AI help in our lives?', 'Is it good to arrive early in any situation?', 'Do you know anyone who likes to get up early?', 'Why do people get up early?', 'What kinds of occasions need people to arrive early?', 'Why do some people like to stay up late?', 'Do Vietnamese people like travelling abroad?', 'Who prefers travelling abroad? The young or the old?', 'How much time do you think people should spend on a trip abroad?', 'Which is better for knowing more about a country? Travelling or reading books about it?'] },
  ],
},
/* ================================================================ WEEK 7 */
{
  n: 7, title: 'Entertainment & media',
  focus: 'Longer Part 3 answers (3–4 sentences). Practise speaking even when you have no idea yet: “I’m not sure, but I’d say…”.',
  p1: [
    { id: 'W7-A', title: 'Films, sport & comedy', from: 'Films/cinemas, Sports programs, Jokes & Comedies',
      q: [
        ['What films do you like?', 'How often do you watch films?', 'Did you often watch films when you were a child?'],
        ['Do you prefer to watch films at home or in the cinema?', 'Do you often go to the cinema with your friends?', 'Do you think going to the cinema is a good way to spend time with friends?', 'Did you ever go to the cinema alone as a child?'],
        ['Do you like watching sports programs on TV?', 'Do you like to watch live sports games?', 'Have you ever watched a sports game in a stadium?'],
        ['Do you prefer to watch sports games alone or with a group of friends?', 'Who do you like to watch sports games with?'],
        ['Do you like to watch comedies?', 'Have you ever watched a live show?'],
        ['Are you good at telling jokes?', 'Do your friends like to tell jokes?'],
      ],
      o: ['What kinds of games do you expect to watch in the future?'] },
    { id: 'W7-B', title: 'Getting around & rubbish', from: 'Cars, Travelling, Rubbish and recycling',
      q: [
        ['Do you prefer to be a driver or a passenger?', 'Do you prefer to sit by the window when travelling?', 'Did you enjoy traveling by car when you were a kid?', 'Did you have a long journey with your family as a child?'],
        ['What types of cars do you like?', 'Do you think car colours are important?'],
        ['What do you usually do when there is a traffic jam?'],
        ['How do you recycle things like paper and plastic?', 'What do you do when you see rubbish on the street?'],
      ],
      o: [] },
  ],
  stories: [
    { id: 'W7-S1', title: 'A fun day out',
      hint: 'Pick one evening or day out with friends or family.',
      p2: ['Describe a special day out that cost you little money/didn’t cost you much', 'When the day was', 'Where you went', 'How much you spent', 'And explain how you feel about the day'],
      p3: [
        ['How do people spend their leisure time in your country?', 'Do people like to spend their leisure time out in your country?'],
        ['How does technology affect the way people spend their leisure time?'],
        ['Why do some people like to watch sports events?', 'Where do people normally watch sports events?', 'What are the advantages of watching sports events online?'],
        ['Does everything need to be well prepared?', 'How would you feel when you were not well prepared for something?', 'Do people need others’ help when organizing things?'],
      ],
      v: [
        ['Describe an enjoyable evening you had with your friends', 'When and where it was · What you did · Who you spent the evening with · And explain why it was enjoyable'],
        ['Describe a time when you organized a happy event successfully', 'What the event was · How you prepared for it · Who helped you to organize it · And explain why you think it was a successful event'],
        ['Describe a live sports event you watched and liked', 'What it was · When and where you watched it · Who you watched it with · And explain why you liked it'],
      ],
      o: ['Do you think only old people have time for leisure?', 'Why do people like to have days off?', 'Going out to have holidays is tiring. Why do people still want to do it?', 'How do people get along in a big family?', 'Do you prefer to prepare and organize an activity or just take part in an activity?', 'How can parents help children to be organized?', 'On what occasions do people need to be organized?', 'What sports matches are suitable for children to attend?'] },
    { id: 'W7-S2', title: 'Videos, films & books',
      hint: 'Pick one video or film you remember well.',
      p2: ['Describe an interesting video', 'When and where you watched it', 'What it is about', 'Why you watched it', 'And explain how you feel about it'],
      p3: [
        ['Which is more helpful, watching videos or reading books?', 'Are movies more likely to help people become more creative than books?', 'What skills can people learn from watching videos?'],
        ['What are the differences between watching movies at home and in a cinema?'],
        ['What are the advantages of keeping a pet?', 'Many people regard pets as members of their family. What do you think?', 'Do many people keep pets in your country?'],
        ['Do people prefer local or international news?', 'Do people read the newspaper where you live?'],
      ],
      v: [
        ['Describe your least favourite movie', 'When you watched it · Where you watched it · What it was about · And explain why it’s your least favourite movie'],
        ['Describe a story/book with animals in it', 'What animals are in it · What the story/book is about · Why you read the story/book · And explain what you think of this story/book'],
        ['Describe a piece of local news that people are interested in', 'What it was about · Where you saw/heard it · Who was involved · And explain why people were interested in it'],
      ],
      o: ['What kind of videos do people in your country like to watch?', 'Are there any differences between the videos that young people and old people like to watch?', 'What kinds of movies are the most popular in Vietnam?', 'Can movies help people better understand the cultural background of a country?', 'Should schools teach children about animals?', 'Some people think pets should not be kept in cities. What do you think?', 'Why do people always tell children stories with animals?', 'Do you think it’s important to have a national identity?', 'How can people develop their national identity?'] },
  ],
},
/* ================================================================ WEEK 8 */
{
  n: 8, title: 'Hard topics & new questions',
  focus: 'Get the Q1/2027 forecast (topics usually change in early January) and fit the new topics into stories you already have. Only prepare something new when a topic really doesn’t fit.',
  tasks: [
    'Part 1: review the “Where you live” group (W1-B). Answer the required questions again and compare with your Week 1 recordings.',
    'Find the Q1/2027 forecast and write the new topics in the “New Q1/2027 topics” box at the end of this week. For each new topic, note which story you can use (e.g. W3-S1).',
    'Part 2: prepare 2 ★ topics – write 4–5 keywords in 1 minute, then speak for 2 minutes and record it.',
    'Part 3: answer the 7 required questions using Answer – Reason – Example.',
    'Weekend: a mock test of about 12 minutes with any questions from this week.',
  ],
  review: 'W1-B',
  p1: [],
  stories: [
    { id: 'W8-S1', title: 'Laws & the environment',
      hint: 'Pick one simple law (no littering, limits on plastic bags…).',
      p2: ['Describe a law on environmental protection', 'What it is', 'How you first learned about it', 'Who benefits from it', 'And explain how you feel about this law'],
      p3: [
        ['Do you think school rules are important?', 'What kinds of rules do schools in Vietnam have?', 'What rules should students follow at school?', 'What kinds of rules do schools in China have?'],
        ['Do people in your country usually obey the law?', 'What are the benefits for people to obey rules?'],
        ['How can parents and teachers help children understand and follow rules?', 'How can parents teach children to obey rules?'],
        ['What environmental laws does your country already have?'],
      ],
      v: [
        ['Describe an environmental law you would like your country to introduce', 'What law it should be · Why people should follow the law · Whether the law will be popular · And explain how you feel about this law'],
        ['Describe a new law you would like to introduce in your country', 'What law it is · What changes this law brings · Whether this new law will be popular · How you came up with the new law · And explain how you feel about this new law'],
      ],
      o: ['Are children unhappy with the school rules?', 'What is the purpose of punishment?', 'How does technology affect the law?', 'Will there be a law that is universally accepted?', 'What kinds of behavior are considered as good behavior?', 'Do you think children can learn about the law outside of school?'] },
    { id: 'W8-S2', title: 'Your goals & habits',
      hint: 'A long-term goal of yours and one habit that “wastes your time”.',
      p2: ['Describe a long-term goal/ambition you would like to achieve', 'How long you have had this goal/ambition', 'What it is', 'How you will achieve it', 'And explain why you set it'],
      p3: [
        ['Is it good for a person to be ambitious?', 'Why should children have ambitions?'],
        ['Should parents support their children in pursuing their ambitions?'],
        ['What kinds of things make people feel pressured?'],
      ],
      v: [
        ['Describe an activity you do regularly that you think is a waste of time', 'What it is · When you usually do it · Why you do it · And explain why you think it is a waste of time'],
      ],
      o: ['Why are some young people keen on being fans of superstars?', 'Will you continue doing something when you are aware that it’s a waste of time?', 'Why do some people refuse to abide by rules?'] },
  ],
  newTopics: 'Speaking topics usually change in early January. When the new forecast comes out, write the new topics here and which of your stories you can use for each one.',
},
/* ================================================================ WEEK 9 */
{
  n: 9, title: 'Mock tests',
  focus: 'Do 3 full mock tests (11–14 minutes). The examiner doesn’t show you the questions beforehand. The Part 2 topics are “rotated” topics, so you practise reusing the stories you already have.',
  tasks: [
    'Do the 3 mock tests below, 11–14 minutes each, at least 1 day apart.',
    'The examiner (a teacher or parent) keeps the questions – don’t look before you start. Part 2: 1 minute to prepare, then speak for up to 2 minutes.',
    'After each test: write down 1 thing you did well and 1 thing you want to improve. No band scores.',
  ],
  p1: [], stories: [],
  mocks: [
    { id: 'MOCK-1',
      p1: [
        { title: 'Studies', from: 'W1-A', q: ['What subjects are you studying?', 'Why did you choose to study that subject?', 'Do you have any plans for your studies in the next five years?'] },
        { title: 'Your day', from: 'W2-A', q: ['What is your morning routine?', 'What do you usually do in the evening?', 'Do you like the morning or evening?'] },
        { title: 'Your things: lost, collected, tidy', from: 'W6-B', q: ['Have you ever lost things?', 'What will you do if you find something lost by others?', 'Do you collect things?'] },
      ],
      p2: ['Describe a city that you have been to and would like to visit again', 'When you visited it', 'What you did there', 'What it was like', 'And explain why you would like to visit it again'],
      reuse: 'W2-S1',
      p3: ['What’s the difference between the city and the countryside?', 'Some people say large cities are suitable for old people. What do you think?', 'Do you think it is possible that all of the population move to cities?', 'Do you think people in the countryside are friendlier than people in the city?', 'Are there any changes in your city?'] },
    { id: 'MOCK-2',
      p1: [
        { title: 'Where you live: home, hometown, neighbourhood, city', from: 'W1-B', q: ['Who do you live with?', 'Can you describe the place where you live?', 'How long have you lived there?'] },
        { title: 'Clothes & accessories', from: 'W4-B', q: ['What kind of clothes do you like to wear?', 'Do you spend a lot of time choosing clothes?', 'Do you like buying shoes? How often?'] },
        { title: 'Films, sport & comedy', from: 'W7-A', q: ['What films do you like?', 'Do you prefer to watch films at home or in the cinema?', 'Do you like watching sports programs on TV?'] },
      ],
      p2: ['Describe a happy person you know', 'Who this person is', 'What he/she is like', 'How he/she shows happiness', 'And explain why you think he/she is a happy person'],
      reuse: 'W3-S1',
      p3: ['Should teachers know what children are doing all the time?', 'Do you think teachers are able to spot the unhappy children?', 'How can the arts spread positive emotions in society?', 'When do you think people are happiest?'] },
    { id: 'MOCK-3',
      p1: [
        { title: 'Where you live: home, hometown, neighbourhood, city', from: 'W1-B', q: ['Who do you live with?', 'Can you describe the place where you live?', 'How long have you lived there?'] },
        { title: 'Art, crafts & music', from: 'W3-B', q: ['Do you like art?', 'Have you made any crafts with paper?', 'Do you still write physical letters?'] },
        { title: 'Science, history & space', from: 'W5-A', q: ['Do you like science?', 'What kinds of interesting things have you done with science?', 'Do you like watching science TV programs?'] },
      ],
      p2: ['Describe a plan that you had to change recently', 'When this happened', 'What made you change the plan', 'What the new plan was', 'And how you felt about the change'],
      reuse: 'W5-S2',
      p3: ['Do people often change their plans?', 'Would you tell others if you change your plan?', 'Why do you think parents still make plans for their children nowadays?', 'How does technology help people make plans?'] },
  ],
},
/* ================================================================ WEEK 10 */
{
  n: 10, title: 'Light review before the exam',
  focus: 'No new topics. Quickly review the “Where you live” group (W1-B) and your core stories. Do the last mock test 3–4 days before the exam; in the last 2 days, just chat in English and get enough sleep.',
  tasks: [
    'Do the final mock test below 3–4 days before the exam.',
    'The examiner keeps the questions – don’t look before you start. Part 2: 1 minute to prepare, then speak for up to 2 minutes.',
    'After the test: write down 1 thing you did well and 1 thing you want to improve. No band scores.',
    'Quickly review the stories in the table at the end of this week (just read your keywords and say each story once).',
    'Last 2 days: nothing new – just chat in English and get enough sleep.',
  ],
  p1: [], stories: [],
  mocks: [
    { id: 'MOCK-4',
      p1: [
        { title: 'Studies', from: 'W1-A', q: ['What subjects are you studying?', 'Why did you choose to study that subject?', 'Do you have any plans for your studies in the next five years?'] },
        { title: 'Parks & old buildings', from: 'W2-B', q: ['Do you still like going to parks now?', 'What do you like to do when visiting a park?', 'How are the parks today different from those you visited as a kid?'] },
        { title: 'Shopping, fruit & vegetables', from: 'W6-A', q: ['Do you like shopping?', 'Do you prefer online shopping or in-store shopping?', 'What do people usually buy on the street market?'] },
      ],
      p2: ['Describe a friend from your childhood', 'Who he/she is', 'Where and how you met each other', 'What you often did together', 'And explain what made you like him/her'],
      reuse: 'W4-S1',
      p3: ['Do you still keep in touch with your friends from childhood? Why or why not?', 'How important is childhood friendship to children?', 'What do you think of communicating via social media?', 'Do you think online communication through social media will replace face-to-face communication?', 'What’s the difference between having younger friends and older friends?'] },
  ],
  storyReview: true,
},
];

/* Part 3 idea hints – 2–3 short keyword ideas for each required Part 3 question.
 * Key = the question text exactly as in WEEKS (straight ' and curly ’ are treated the same). */
const P3_IDEAS = {
  // Week 1 – A natural place near your home
  'Do you think there should be many natural places in cities?': ['Yes – fresh air, less stress', 'Places to exercise and for kids to play', 'e.g. a park or lake near my home'],
  'Do you think staying in a natural place would help change people’s mood?': ['Yes – quiet, green, relaxing', 'Away from phones, noise and traffic', 'e.g. a walk by the lake after school'],
  'Are rivers and lakes important to a country?': ['Yes – water for farms and daily life', 'Transport, fishing, tourism', 'e.g. the Mekong River, West Lake'],
  'Why do you think some people choose not to travel abroad?': ['Too expensive – flights, hotels', 'Language problems, visas', 'Prefer to explore their own country'],
  // Week 2 – A trip
  'Where do people in your country often go for holidays?': ['Beaches – Nha Trang, Da Nang, Phu Quoc', 'Mountains – Da Lat, Sa Pa', 'Back to their hometown at Tet'],
  'Is it important to plan a holiday?': ['Yes – save money and time', 'Book hotels early, avoid crowds', 'But some fun comes from surprises'],
  'What is the ideal length for a holiday?': ['About 4–5 days or one week', 'Enough to relax, not too expensive', 'Too long → bored, miss home'],
  'What’s the difference between the city and the countryside?': ['City: busy, modern, many jobs and shops', 'Countryside: quiet, fresh air, rice fields', 'Life is cheaper and slower in the countryside'],
  // Week 2 – A crowded, noisy place
  'Why do people go to crowded places?': ['Shopping, food, festivals', 'Exciting atmosphere, meet friends', 'Cheap prices at markets'],
  'What kinds of noises are there in our life?': ['Traffic and motorbike horns', 'Construction, loud music', 'Nature: birds, rain, the sea'],
  'Do you think it is good for children to make noise?': ['Yes – playing is natural and healthy', 'But they should learn when to be quiet', 'e.g. not in libraries or hospitals'],
  'Are there many tall buildings in your country?': ['Yes – in big cities like Hanoi and Ho Chi Minh City', 'e.g. Landmark 81', 'Not many in the countryside'],
  // Week 3 – An older person
  'What can young and old people learn from each other?': ['Young → old: technology, new trends', 'Old → young: life experience, patience', 'Traditions and family stories'],
  'What do old people usually do in their daily life?': ['Exercise in the park in the morning', 'Look after grandchildren', 'Gardening, watching TV, chatting with neighbours'],
  'Why do some people like to grow plants?': ['Relaxing, reduces stress', 'Fresh, safe vegetables', 'Makes the home green and beautiful'],
  'Why should children learn new skills?': ['Easier to learn when young', 'More confident and independent', 'Useful later – e.g. swimming, English'],
  // Week 4 – A friend
  'Do you still keep in touch with your friends from childhood? Why or why not?': ['Yes – through Facebook, Zalo', 'Not really – moved away, different schools', 'Still meet at Tet or birthdays'],
  'Do you think online communication through social media will replace face-to-face communication?': ['No – face-to-face feels warmer', 'Online is fast and easy, but can feel cold', 'Body language, hugs, sharing meals'],
  'How do people make friends in Vietnam?': ['At school and university', 'Through clubs, sports, social media', 'Neighbours, friends of friends'],
  'Why are some people keen on taking photos?': ['Keep memories', 'Share on social media', 'A hobby – beautiful places, food'],
  // Week 4 – A famous person
  'Why are some students popular?': ['Friendly, funny, helpful', 'Good at studying or sports', 'Good-looking, confident'],
  'What kinds of people are frequently interviewed?': ['Celebrities – singers, athletes', 'Experts, politicians', 'People in the news – heroes, witnesses'],
  'Why are many advertisements endorsed by celebrities? How useful are they?': ['Fans trust and copy their idols', 'Gets attention quickly', 'Useful? Sells more, but not always honest'],
  'What are the advantages and disadvantages of advertisements?': ['Good: news about products and sales', 'Bad: too many, annoying', 'Make people buy things they don’t need'],
  // Week 5 – Studying
  'What’s the best way to learn a language?': ['Practise every day', 'Speak with friends or native speakers', 'Films, music, apps like Duolingo'],
  'What difficulties do people face when learning a language?': ['Pronunciation, grammar', 'Not enough time, feeling lazy', 'Shy, afraid of making mistakes'],
  'Do you think it is easier for children to learn new skills than for adults?': ['Yes – kids learn fast, not shy', 'Kids have more free time', 'Adults: more focused, know why they learn'],
  'Should students learn to do group work?': ['Yes – teamwork for future jobs', 'Share ideas, learn from friends', 'But some members are lazy'],
  // Week 5 – A decision / a change
  'How do people usually make important decisions?': ['Ask family and friends', 'Think about pros and cons', 'Search for information online'],
  'Which is better, to make a decision quickly or slowly?': ['Slowly for big things – school, job', 'Quickly for small things – food, clothes', 'Too slow → lose chances'],
  'Do you think children sometimes have to make important decisions?': ['Yes – choosing a school or subject', 'Choosing friends', 'Parents should help them'],
  'Do you think it is good to change one’s daily routine?': ['Yes – less boring, more creative', 'Try new hobbies, new habits', 'But too many changes → stressful'],
  // Week 6 – Shopping, gifts & food
  'Is it easier to spend money or save money?': ['Spending is easier', 'Online shopping – just one click', 'Saving needs a plan and self-control'],
  'Should schools teach children how to manage money from a young age?': ['Yes – learn the value of money', 'Avoid debt in the future', 'e.g. a piggy bank, pocket money'],
  'What are the differences between online shopping and in-store shopping?': ['Online: cheap, convenient, many choices', 'In-store: try things on, see the real quality', 'Online: risk of fake products'],
  'What do people usually consider when buying gifts?': ['The person’s hobbies and needs', 'Price – their budget', 'Something meaningful or useful'],
  // Week 6 – An unlucky day
  'What can we do to reduce the possibility of losing things?': ['Keep things in one place', 'Check your bag before leaving', 'Phone apps – e.g. Find My'],
  'How can we solve the traffic jam problem?': ['More public transport – buses, metro', 'Better roads, fewer private vehicles', 'Work from home, flexible hours'],
  'Why do some people prefer sending a message instead of making a call?': ['Faster and quieter', 'Can reply later', 'Less awkward for shy people'],
  'Do you think students are overly reliant on AI?': ['Yes – copy answers, don’t think', 'But AI helps explain hard lessons', 'Use it as a tool, not to cheat'],
  // Week 7 – A fun day out
  'How do people spend their leisure time in your country?': ['Coffee with friends', 'Watching films, using phones', 'Parks, shopping malls'],
  'How does technology affect the way people spend their leisure time?': ['More time on screens – games, TikTok', 'Less time outdoors', 'Easy to book trips, watch films at home'],
  'Why do some people like to watch sports events?': ['Exciting atmosphere', 'Support their team or country', 'Watch with friends – e.g. football matches'],
  'Does everything need to be well prepared?': ['Big things: yes – exams, trips', 'Small things: no need', 'Surprises can be fun'],
  // Week 7 – Videos, films & books
  'Which is more helpful, watching videos or reading books?': ['Videos: fast, easy, fun', 'Books: deeper, better for focus', 'Depends on the topic'],
  'What are the differences between watching movies at home and in a cinema?': ['Home: cheap, comfortable, pause anytime', 'Cinema: big screen, great sound', 'Cinema feels like a special day out'],
  'What are the advantages of keeping a pet?': ['A good friend, less lonely', 'Teaches children responsibility', 'More exercise – e.g. walking a dog'],
  'Do people prefer local or international news?': ['Local: daily life, traffic, weather', 'International: big events, sports', 'Most people read local news first'],
  // Week 8 – Laws & the environment
  'Do you think school rules are important?': ['Yes – keep order and safety', 'Teach discipline', 'Prepare kids for laws in society'],
  'Do people in your country usually obey the law?': ['Mostly yes', 'Some break traffic rules – red lights, no helmet', 'Fines help people obey'],
  'How can parents and teachers help children understand and follow rules?': ['Explain the reasons', 'Be good role models', 'Praise good behaviour'],
  'What environmental laws does your country already have?': ['No littering – fines', 'Limits on plastic bags', 'Rules for factory waste'],
  // Week 8 – Your goals & habits
  'Is it good for a person to be ambitious?': ['Yes – gives motivation and goals', 'Helps people work hard', 'Too ambitious → stress'],
  'Should parents support their children in pursuing their ambitions?': ['Yes – money, advice, encouragement', 'But let children choose', 'Don’t push too hard'],
  'What kinds of things make people feel pressured?': ['Exams and grades', 'Parents’ expectations', 'Work, money, social media'],
};
