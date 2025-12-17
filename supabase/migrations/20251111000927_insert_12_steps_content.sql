/*
  # Insert 12 Steps Content
*/

INSERT INTO public.steps_content (step_number, title, description, detailed_content, reflection_prompts) VALUES
(1, 'Admit Powerlessness', 'We admitted we were powerless over alcohol—that our lives had become unmanageable.',
'The first step is about honesty and acceptance. It requires acknowledging that addiction has taken control and that attempts to manage it on our own have failed.

Key concepts:
- Powerlessness means recognizing that willpower alone cannot overcome addiction
- Unmanageability refers to the chaos addiction brings to all areas of life
- This step is the foundation for all other steps
- Acceptance opens the door to recovery',
'["What examples from my life show that my addiction has become unmanageable?", "When have I tried to control my drinking/using and failed?", "What areas of my life have been affected by my addiction?", "What does powerlessness mean to me?"]'::jsonb),

(2, 'Believe in a Higher Power', 'Came to believe that a Power greater than ourselves could restore us to sanity.',
'Step 2 introduces the concept of hope and opens us to the possibility of help from a source beyond ourselves.

Key concepts:
- Sanity means sound thinking and reasonable behavior
- The Higher Power is personally defined
- This step is about hope and possibility
- Faith begins as willingness to believe',
'["What does sanity mean to me in the context of my recovery?", "What might a Higher Power look like for me?", "When have I experienced moments of clarity or peace?", "What gives me hope that recovery is possible?"]'::jsonb),

(3, 'Turn Over Your Will', 'Made a decision to turn our will and our lives over to the care of God as we understood Him.',
'Step 3 is about making a decision - choosing to let go of self-will and trusting in something greater.

Key concepts:
- This is a decision, not a completed action
- "God as we understood Him" allows for personal interpretation
- Turning over means trusting the recovery process
- Self-will often led us into addiction',
'["What does turning over my will mean to me?", "In what areas of my life do I struggle with control?", "How might my life be different if I trusted the process?", "What fears come up when I think about letting go?"]'::jsonb),

(4, 'Make a Moral Inventory', 'Made a searching and fearless moral inventory of ourselves.',
'Step 4 involves honest self-examination. It''s about looking at our patterns, behaviors, resentments, and fears.

Key concepts:
- Moral inventory examines character traits and behaviors
- Include both strengths and areas for growth
- Resentments, fears, and harmful behaviors are examined
- Honesty is essential',
'["What resentments am I holding onto?", "What fears have driven my behavior?", "How have my actions harmed myself and others?", "What patterns do I notice in my relationships?"]'::jsonb),

(5, 'Admit Wrongs', 'Admitted to God, to ourselves, and to another human being the exact nature of our wrongs.',
'Step 5 is about confession and connection. Sharing our inventory with another person helps break the isolation of addiction.

Key concepts:
- Sharing brings relief and connection
- Choose a trustworthy person to hear your inventory
- Honesty includes admitting our part in situations
- This step reduces shame and guilt',
'["Who might be a good person to share my inventory with?", "What feelings come up when I think about sharing my wrongs?", "What am I most reluctant to admit?", "How might sharing bring me relief?"]'::jsonb),

(6, 'Become Ready for Change', 'Were entirely ready to have God remove all these defects of character.',
'Step 6 is about willingness. After identifying our shortcomings, we prepare ourselves mentally and spiritually to let them go.

Key concepts:
- Character defects are patterns that no longer serve us
- Readiness means being willing to change
- This is preparation, not the change itself
- Some defects may have felt protective',
'["Which character defects am I ready to let go of?", "Which ones am I still attached to?", "What might life look like without these defects?", "What fears do I have about changing?"]'::jsonb),

(7, 'Ask for Removal of Shortcomings', 'Humbly asked Him to remove our shortcomings.',
'Step 7 is about humility and asking for help. We recognize that we cannot change ourselves through willpower alone.

Key concepts:
- Humility is an accurate view of ourselves
- Asking means being open to help
- Change is a process, not an event
- Our Higher Power works through many sources',
'["What does humility mean to me?", "How comfortable am I asking for help?", "Which shortcomings do I most want removed?", "How have I already begun to change?"]'::jsonb),

(8, 'List People Harmed', 'Made a list of all persons we had harmed, and became willing to make amends to them all.',
'Step 8 involves taking responsibility for the harm we''ve caused. We create a list of people we''ve hurt.

Key concepts:
- Focus on our part, not others'' actions
- Include ourselves on the list
- Willingness is the goal at this stage
- Making amends comes in Step 9',
'["Who have I harmed through my addiction?", "How have I harmed myself?", "What resistances do I have to making amends?", "What does willingness mean in this context?"]'::jsonb),

(9, 'Make Amends', 'Made direct amends to such people wherever possible, except when to do so would injure them or others.',
'Step 9 is about taking action to repair the damage we''ve caused.

Key concepts:
- Direct amends involve face-to-face acknowledgment
- Some amends are best made through changed behavior
- Consider the impact on others before making amends
- This step brings freedom and peace',
'["Which amends can I make directly?", "Which might cause more harm?", "How can I make living amends through changed behavior?", "What do I hope to gain from making amends?"]'::jsonb),

(10, 'Continue Personal Inventory', 'Continued to take personal inventory and when we were wrong promptly admitted it.',
'Step 10 is about maintenance. We continue the self-examination process daily.

Key concepts:
- Daily reflection prevents buildup
- Prompt admission prevents resentments
- This step keeps us honest
- Regular inventory supports long-term recovery',
'["What does a daily inventory look like for me?", "How quickly do I usually admit when I am wrong?", "What patterns tend to resurface?", "How has regular self-examination helped me?"]'::jsonb),

(11, 'Seek Spiritual Connection', 'Sought through prayer and meditation to improve our conscious contact with God as we understood Him.',
'Step 11 deepens our spiritual practice. Through prayer and meditation, we strengthen our connection to our Higher Power.

Key concepts:
- Prayer and meditation can take many forms
- The goal is conscious contact, not perfection
- We seek guidance, not specific outcomes
- This practice supports daily recovery',
'["What spiritual practices resonate with me?", "How do I experience conscious contact?", "What does seeking guidance mean in my life?", "How can I deepen my spiritual practice?"]'::jsonb),

(12, 'Help Others', 'Having had a spiritual awakening as the result of these Steps, we tried to carry this message to alcoholics.',
'Step 12 is about service and living the principles. We share our experience with others.

Key concepts:
- Spiritual awakening is the result of working the steps
- Helping others strengthens our own recovery
- These principles apply to all of life
- Recovery is a way of living, not just abstinence',
'["What does spiritual awakening mean to me?", "How can I carry the message to others?", "In what areas of my life can I practice these principles?", "How has helping others helped my recovery?"]'::jsonb)

ON CONFLICT (step_number) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  detailed_content = EXCLUDED.detailed_content,
  reflection_prompts = EXCLUDED.reflection_prompts,
  updated_at = now();
