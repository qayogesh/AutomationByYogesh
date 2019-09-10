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
@JsonPropertyOrder({ "ID", "Title", "DueDate", "Completed" })

public class AzurePostEntities {

	@JsonProperty("ID")
	private Integer iD;
	@JsonProperty("Title")
	private String title;
	@JsonProperty("DueDate")
	private String dueDate;
	@JsonProperty("Completed")
	private Boolean completed;
	@JsonIgnore
	private Map<String, Object> additionalProperties = new HashMap<String, Object>();

	/**
	* No args constructor for use in serialization
	*
	*/
	public AzurePostEntities() {
	}

	/**
	 *
	 * @param title
	 * @param dueDate
	 * @param iD
	 * @param completed
	 */
	public AzurePostEntities(Integer iD, String title, String dueDate, Boolean completed) {
		super();
		this.iD = iD;
		this.title = title;
		this.dueDate = dueDate;
		this.completed = completed;
	}

	@JsonProperty("ID")
	public Integer getID() {
		return iD;
	}

	@JsonProperty("ID")
	public void setID(Integer iD) {
		this.iD = iD;
	}

	@JsonProperty("Title")
	public String getTitle() {
		return title;
	}

	@JsonProperty("Title")
	public void setTitle(String title) {
		this.title = title;
	}

	@JsonProperty("DueDate")
	public String getDueDate() {
		return dueDate;
	}

	@JsonProperty("DueDate")
	public void setDueDate(String dueDate) {
		this.dueDate = dueDate;
	}

	@JsonProperty("Completed")
	public Boolean getCompleted() {
		return completed;
	}

	@JsonProperty("Completed")
	public void setCompleted(Boolean completed) {
		this.completed = completed;
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
