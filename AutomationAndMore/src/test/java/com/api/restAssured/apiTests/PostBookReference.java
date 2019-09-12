package com.api.restAssured.apiTests;

import java.util.concurrent.TimeUnit;

import org.testng.Assert;
import org.testng.annotations.Test;

import com.api.restAssured.Utils.RestUtils;
import com.api.restAssured.entities.PostBookEntities;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.restassured.RestAssured;
import com.jayway.restassured.http.ContentType;
import com.jayway.restassured.path.json.JsonPath;
import com.jayway.restassured.response.ValidatableResponse;

public class PostBookReference extends RestUtils {

	String HOST = "https://fakerestapi.azurewebsites.net";

	@Test
	public void PostBookReference() throws JsonProcessingException {
		PostBookEntities postBookEntities = new PostBookEntities(101, "Win and the Winner", "My story", 254,
				"This is string", "2019-09-12T04:39:24.560Z");
		ObjectMapper mapper = new ObjectMapper();
		String jsonString = mapper.writeValueAsString(postBookEntities);

		RestAssured.baseURI = HOST;
		ValidatableResponse response = RestUtils.requestSpecification(HOST).given().accept(ContentType.JSON).when()
				.body(jsonString).post("/api/Books").then();

		System.out.println("response " + response.extract().asString());
		Assert.assertEquals(response.extract().statusCode(), 200);

		JsonPath jp = new JsonPath(response.extract().asString());

		Assert.assertEquals(jp.getInt("ID"), 101);
		Assert.assertEquals(jp.get("Title"), "Win and the Winner");
		Assert.assertEquals(jp.get("Description"), "My story");
		Assert.assertEquals(jp.getInt("PageCount"), 254);
		Assert.assertEquals(jp.get("Excerpt"), "This is string");
		Assert.assertEquals(jp.get("PublishDate"), "2019-09-12T04:39:24.56Z");

	}
}
