def torf():
    print("Test: What is your identity?")
    
    questions = [
        ("First question: Dog or Cat? (True/False)", True),
        ("Second question: u want a silnce ? (True/False)", True),
        ("Third question: The sun is cold. (True/False)", False),
        ("four question: if noam king ? (True/False)", True),
    ]
    
    for question, correct_answer in questions:
        answer = input(question + " ")
        
        if answer == "true":
            user_answer = True
        elif answer == "false":
            user_answer = False
        else:
            print("Invalid answer. Please enter True or False.")
            continue
        
        if user_answer == correct_answer:
            print("Good choice! Next question...\n")
        else:
            print("Incorrect answer. Try again!\n")

torf()
