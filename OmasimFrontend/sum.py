import random 

def blackjack(a, b):
    player = a + b  
    dealer = random.randint(1, 30)  
    return player, dealer

player_cardOne = int(input("Type a number: "))
player_cardTWO = int(input("Type another number: "))

player, dealer = blackjack(player_cardOne, player_cardTWO)

print(f"Your total: {player}, Dealer's number: {dealer}")

if player <= 21:
    print(" you win the dealer!")
else:
    print("It's more than 21, you lose!")
