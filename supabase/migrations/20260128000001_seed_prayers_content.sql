/*
  # Seed Prayers Content

  Inserts prayer content for:
  - Step prayers (one for each of the 12 steps)
  - Common recovery prayers (Serenity, Third Step, Seventh Step, etc.)
*/

-- Step Prayers
INSERT INTO public.prayers (title, content, category, step_number, sort_order) VALUES
-- Step 1 Prayer
('First Step Prayer', 'Dear Higher Power, I admit that I am powerless over my addiction. I admit that my life is unmanageable when I try to control it. Help me this day to understand the true meaning of powerlessness. Remove from me all denial of my addiction.', 'step', 1, 1),

-- Step 2 Prayer
('Second Step Prayer', 'Heavenly Father, I know in my heart that only you can restore me to sanity. I humbly ask that you remove all twisted thought and addictive behavior from me this day. Heal my spirit and restore in me a clear mind.', 'step', 2, 2),

-- Step 3 Prayer
('Third Step Prayer', 'God, I offer myself to Thee—to build with me and to do with me as Thou wilt. Relieve me of the bondage of self, that I may better do Thy will. Take away my difficulties, that victory over them may bear witness to those I would help of Thy Power, Thy Love, and Thy Way of life. May I do Thy will always.', 'step', 3, 3),

-- Step 4 Prayer
('Fourth Step Prayer', 'Dear God, it is I who has made my life a mess. I have done it, but I cannot undo it. I will begin a searching and fearless moral inventory. I will write down my wrongdoings, my defects of character, and my weaknesses. Grant me the strength, courage, and honesty to see myself as I truly am.', 'step', 4, 4),

-- Step 5 Prayer
('Fifth Step Prayer', 'Higher Power, my inventory has shown me who I am, yet I ask for your help in admitting my wrongs to another person and to you. Assure me and be with me in this step, for without your guidance I cannot do this alone.', 'step', 5, 5),

-- Step 6 Prayer
('Sixth Step Prayer', 'Dear God, I am ready for your help in removing from me the defects of character which I now realize are an obstacle to my recovery. Help me to continue being honest with myself, and guide me toward spiritual and mental health.', 'step', 6, 6),

-- Step 7 Prayer
('Seventh Step Prayer', 'My Creator, I am now willing that you should have all of me, good and bad. I pray that you now remove from me every single defect of character which stands in the way of my usefulness to you and my fellows. Grant me strength, as I go out from here, to do your bidding. Amen.', 'step', 7, 7),

-- Step 8 Prayer
('Eighth Step Prayer', 'Higher Power, I ask your help in making my list of all those I have harmed. I will take responsibility for my mistakes, and be forgiving to others as you are forgiving to me. Grant me the willingness to begin my restitution. This I pray.', 'step', 8, 8),

-- Step 9 Prayer
('Ninth Step Prayer', 'Higher Power, I pray for the right attitude to make my amends, being ever mindful not to harm others in the process. I ask for your guidance in making indirect amends. Most importantly, I will continually strive to make direct amends wherever possible, except when to do so would injure them or others.', 'step', 9, 9),

-- Step 10 Prayer
('Tenth Step Prayer', 'I pray I may continue to take personal inventory and continue to set right any new mistakes as I go along. I will not use my problems as an excuse to drink or use, for my problems are of my own making. Help me correct my course when I stray from the path of recovery.', 'step', 10, 10),

-- Step 11 Prayer
('Eleventh Step Prayer', 'Higher Power, as I understand you, I pray to keep my connection with you open and clear from the confusion of daily life. Through my prayers and meditation, I ask especially for freedom from self-will, rationalization, and wishful thinking. I pray for the guidance of correct thought and positive action.', 'step', 11, 11),

-- Step 12 Prayer
('Twelfth Step Prayer', 'Dear God, my spiritual awakening continues to unfold. The help I have received I shall pass on and give to others, both in and out of the program. For this opportunity I am grateful. I pray most humbly to continue walking day by day on the road of spiritual progress. I pray for the inner strength and wisdom to practice the principles of this way of life in all I do and say. I need you, my friends, and the program every hour of every day. This is a better way to live.', 'step', 12, 12)

ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category,
  step_number = EXCLUDED.step_number,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- Common Prayers
INSERT INTO public.prayers (title, content, category, step_number, sort_order) VALUES
('Serenity Prayer', 'God, grant me the serenity to accept the things I cannot change, the courage to change the things I can, and the wisdom to know the difference.', 'common', NULL, 100),

('Serenity Prayer (Extended)', 'God, grant me the serenity to accept the things I cannot change, the courage to change the things I can, and the wisdom to know the difference. Living one day at a time, enjoying one moment at a time; accepting hardship as a pathway to peace; taking, as Jesus did, this sinful world as it is, not as I would have it; trusting that You will make all things right if I surrender to Your will; so that I may be reasonably happy in this life and supremely happy with You forever in the next. Amen.', 'common', NULL, 101),

('Morning Prayer', 'God, direct my thinking today so that it be empty of self-pity, dishonesty, self-will, self-seeking, and fear. God, inspire my thinking, decisions, and intuitions. Help me to relax and take it easy. Free me from doubt and indecision. Guide me through this day and show me my next step. God, give me what I need to take care of any problems. I ask all these things that I may be of maximum service to you and my fellow man. In the spirit of the steps, I pray. Amen.', 'common', NULL, 102),

('Evening Prayer', 'God, forgive me where I have been resentful, selfish, dishonest, or afraid today. Help me to not keep anything to myself but to discuss it all openly with another person—and make amends quickly if I have harmed anyone. Help me to be loving and tolerant of everyone I met today, including myself. Help me to do for others what I would have them do for me. Help me to focus on being of service rather than getting what I want. And please, God, help me to keep sober tonight.', 'common', NULL, 103),

('Set Aside Prayer', 'God, please help me set aside everything I think I know about myself, my disease, these steps, and especially you, God, so I may have an open mind and a new experience with all these things. Please help me see the truth.', 'common', NULL, 104),

('Acceptance Prayer', 'And acceptance is the answer to all my problems today. When I am disturbed, it is because I find some person, place, thing, or situation—some fact of my life—unacceptable to me, and I can find no serenity until I accept that person, place, thing, or situation as being exactly the way it is supposed to be at this moment. Nothing, absolutely nothing, happens in God''s world by mistake.', 'common', NULL, 105),

('Fear Prayer', 'We ask Him to remove our fear and direct our attention to what He would have us be. At once, we commence to outgrow fear.', 'common', NULL, 106),

('Resentment Prayer', 'God, please help me to be free of anger and to see that the world and its people have dominated me. Please show me how to remove my resentments and guide me to be helpful rather than harmful to others.', 'common', NULL, 107),

('Prayer for Others', 'God, save me from being angry. Thy will be done. If you will, help me show this person the same tolerance, pity, and patience that I would cheerfully grant a sick friend. God, please help me see this person as a sick person. How can I be helpful to them? God, please keep me from being angry.', 'common', NULL, 108),

('Recovery Prayer', 'Lord, help me to live this day, quietly, easily. To lean upon your great strength, trustfully, restfully. To wait for the unfolding of your will, patiently, serenely. To meet others, peacefully, joyfully. To face tomorrow, confidently, courageously.', 'common', NULL, 109),

('Just for Today', 'Just for today I will try to live through this day only, and not tackle all my problems at once. Just for today I will be happy. Just for today I will adjust myself to what is. Just for today I will improve my mind. Just for today I will be agreeable. Just for today I will have a program and follow it. Just for today I will have a quiet half hour to relax alone with God. Just for today I will be unafraid to enjoy what is beautiful and believe that as I give to the world, the world will give to me.', 'common', NULL, 110),

('Prayer of St. Francis', 'Lord, make me a channel of thy peace; that where there is hatred, I may bring love; that where there is wrong, I may bring the spirit of forgiveness; that where there is discord, I may bring harmony; that where there is error, I may bring truth; that where there is doubt, I may bring faith; that where there is despair, I may bring hope; that where there are shadows, I may bring light; that where there is sadness, I may bring joy. Lord, grant that I may seek rather to comfort than to be comforted; to understand, than to be understood; to love, than to be loved. For it is by self-forgetting that one finds. It is by forgiving that one is forgiven. It is by dying that one awakens to eternal life. Amen.', 'common', NULL, 111),

('Gratitude Prayer', 'Thank you, God, for this sober day. Help me to remember that sobriety is the most important thing in my life. Without it, I have no life. Help me to remember that meetings, sponsorship, and working the steps are the way I stay close to you. Thank you for bringing me to this program. Amen.', 'common', NULL, 112)

ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category,
  step_number = EXCLUDED.step_number,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();
