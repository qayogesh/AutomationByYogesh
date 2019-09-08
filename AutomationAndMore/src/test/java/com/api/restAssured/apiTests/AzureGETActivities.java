package com.api.restAssured.apiTests;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Map.Entry;

import org.testng.Assert;
import org.testng.annotations.Test;

import com.jayway.restassured.path.json.JsonPath;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.http.Header;
import io.restassured.http.Headers;
import io.restassured.response.ValidatableResponse;

public class AzureGETActivities {

	String uri = "https://fakerestapi.azurewebsites.net/api/Activities";

	@Test
	public void getActivitiesList() {
		RestAssured.baseURI = uri;
		ValidatableResponse response = RestAssured.given().auth().basic("", "").accept(ContentType.JSON).when().get()
				.then();

		System.out.println("response " + response.extract().asString());

		Assert.assertEquals(response.extract().statusCode(), 200);
		System.out.println("Status line " + response.extract().statusLine());

		JsonPath jsonPath = new JsonPath(response.extract().asString());

		ArrayList ids = jsonPath.get("ID");
		System.out.println("idList " + ids);
		for (int i = 0; i < ids.size(); i++) {
			System.out.println("id at index " + i + " " + ids.get(i));
			Assert.assertEquals(ids.get(i), i + 1);
		}

		ArrayList titles = jsonPath.get("Title");
		for (int i = 0; i < titles.size(); i++) {
			System.out.println("Title is " + titles.get(i));
			Assert.assertEquals(titles.get(i), "Activity " + Math.round(i + 1));
		}

		ArrayList<Boolean> statues = jsonPath.get("Completed");
		int a = 0, b = 0;
		for (int i = 0; i < statues.size(); i++) {
			System.out.println("completed status is " + statues.get(i));

			HashMap<Integer, Boolean> map = new HashMap<Integer, Boolean>();

			if (statues.get(i) == (true)) {
				map.put(i + 1, statues.get(i));
				a++;
			} else {
				map.put(i + 2, statues.get(i));
				b++;
			}

			for (Entry<Integer, Boolean> entrySet : map.entrySet()) {
				System.out.println(entrySet.getKey() + " " + entrySet.getValue());
				System.out.println("Map is " + map);
			}
		}

		System.out.println("A true are " + a);
		System.out.println("B false are " + b);

		Headers headers = response.extract().headers();
		for (Header header : headers.asList()) {
			System.out.println("Header name " + header.getName() + " header value " + header.getValue());
		}
	}

}
