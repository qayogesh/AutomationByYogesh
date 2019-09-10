package com.api.restAssured.apiTests;

import org.testng.annotations.Test;

import com.api.restAssured.Utils.RestUtils;
import com.api.restAssured.entities.AzurePostEntities;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.restassured.RestAssured;
import com.jayway.restassured.http.ContentType;
import com.jayway.restassured.response.ValidatableResponse;

public class AzurePOSTActivities {
	String HOST = "https://fakerestapi.azurewebsites.net";

	@Test
	public void testAzurePostActivities() throws JsonProcessingException {
		AzurePostEntities entities = new AzurePostEntities(0, "string", "2019-09-10T04:56:35.656Z", true);
		ObjectMapper mapper = new ObjectMapper();
		String jsonString = mapper.writeValueAsString(entities);

		RestAssured.baseURI = HOST;

		ValidatableResponse response = RestAssured.given().accept(ContentType.JSON).when().body(jsonString)
				.post("/api/Activities").then();

		System.out.println("Response is \n" + response.extract().asString());

	}

}
