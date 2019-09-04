package com.api.restAssured.entities;

import java.util.HashMap;
import java.util.Map;
import com.fasterxml.jackson.annotation.JsonAnyGetter;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonPropertyOrder({ "name", "salary", "age" })

public class EmployeeSalaryEntity {



		@JsonProperty("name")
		private String name;
		@JsonProperty("salary")
		private String salary;
		@JsonProperty("age")
		private String age;
		@JsonIgnore
		private Map<String, Object> additionalProperties = new HashMap<String, Object>();

/**
* No args constructor for use in serialization
* 
*/
public EmployeeSalaryEntity() {
}

/**
* 
* @param age
* @param name
* @param salary
*/
public EmployeeSalaryEntity(String name, String salary, String age) {
super();
this.name = name;
this.salary = salary;
this.age = age;
}

		@JsonProperty("name")
		public String getName() {
			return name;
		}

		@JsonProperty("name")
		public void setName(String name) {
			this.name = name;
		}

		@JsonProperty("salary")
		public String getSalary() {
			return salary;
		}

		@JsonProperty("salary")
		public void setSalary(String salary) {
			this.salary = salary;
		}

		@JsonProperty("age")
		public String getAge() {
			return age;
		}

		@JsonProperty("age")
		public void setAge(String age) {
			this.age = age;
		}

		@JsonAnyGetter
		public Map<String, Object> getAdditionalProperties() {
			return this.additionalProperties;
		}

		@JsonAnySetter
		public void setAdditionalProperty(String name, Object value) {
			this.additionalProperties.put(name, value);
		}

	}
