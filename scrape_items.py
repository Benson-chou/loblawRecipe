from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException
import time
import pandas as pd
import json
from google.cloud.sql.connector import Connector
import pymysql
import sqlalchemy
import os
# pip install python-dotenv
from dotenv import load_dotenv
# pip install "cloud-sql-python-connector[pymysql]"

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
        "item_id": d["id"], 
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
df['categories'] = df["categories"].apply(lambda x: x[0] if isinstance(x, list) and len(x) > 0 else None)
# Can do some filtering here

food_df = df.loc[~(df['categories'].isin(('Household Supplies', 
                                          'Medicine & Health',
                                          'Pet Food & Accessories', None)))]

# Can also do some try to extract the extra points here for the optimization thing

# Drop categories
food_df.drop(columns=['categories'], axis=1, inplace=True)
# Load the data into the database here!
connector = Connector()

def getconn():
    conn: pymysql.connections.Connection = connector.connect(
        "sonorous-sign-429909-i9:northamerica-northeast2:mysql-instance", 
        "pymysql", 
        user = os.getenv('CLOUD_USER'), 
        password = os.getenv('CLOUD_PASSWORD'), 
        db = os.getenv("CLOUD_DB_NAME")
    )
    return conn
# create connection pool
pool = sqlalchemy.create_engine(
    "mysql+pymysql://",
    creator=getconn,
)

food_df.to_sql(name='items', con=pool, if_exists='append', index=False)
print("Food successfully loaded into items table!")