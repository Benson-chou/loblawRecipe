from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException
import time
import pandas as pd
import json

driver = webdriver.Chrome()
loblaw_items = []

url = "https://dam.flippenterprise.net/flyerkit/publication/6672398/products?display_type=all&locale=en&access_token=fd66ddd31b95e07b9ad2744424e9fd32"
driver.get(url)
print("hi")
time.sleep(2)

body = driver.find_element(By.TAG_NAME, "body")
text = body.text

parsed_data = json.loads(text)
for d in parsed_data: 
    loblaw_item = {
        "id": d["id"], 
        "item_name": d["name"],
        "sale_story": d["sale_story"], # Where the extra points are located
        "image": d["image_url"],
        "valid_from": d["valid_from"],
        "valid_to": d["valid_to"],
        "categories": d["categories"],
        "price": d["price_text"]
    }
    loblaw_items.append(loblaw_item)

df = pd.DataFrame(loblaw_items)

# Can do some filtering here
food_df = df.loc[~(df['categories'].isin(['Household Supplies', 
                                          'Medicine & Health',
                                          'Pet Food & Accessories']))]

# Can also do some try to extract the extra points here for the optimization thing

# Drop categories
food_df.drop(['categories'], inplace=True)
# Load the data into the database here!