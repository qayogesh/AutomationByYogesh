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
@JsonPropertyOrder({
"ID",
"Title",
"Description",
"PageCount",
"Excerpt",
"PublishDate"
})
public class PostBookEntities {

@JsonProperty("ID")
private Integer iD;
@JsonProperty("Title")
private String title;
@JsonProperty("Description")
private String description;
@JsonProperty("PageCount")
private Integer pageCount;
@JsonProperty("Excerpt")
private String excerpt;
@JsonProperty("PublishDate")
private String publishDate;
@JsonIgnore
private Map<String, Object> additionalProperties = new HashMap<String, Object>();

/**
* No args constructor for use in serialization
*
*/
public PostBookEntities() {
}

/**
*
* @param pageCount
* @param title
* @param excerpt
* @param description
* @param iD
* @param publishDate
*/
public PostBookEntities(Integer iD, String title, String description, Integer pageCount, String excerpt, String publishDate) {
super();
this.iD = iD;
this.title = title;
this.description = description;
this.pageCount = pageCount;
this.excerpt = excerpt;
this.publishDate = publishDate;
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

@JsonProperty("Description")
public String getDescription() {
return description;
}

@JsonProperty("Description")
public void setDescription(String description) {
this.description = description;
}

@JsonProperty("PageCount")
public Integer getPageCount() {
return pageCount;
}

@JsonProperty("PageCount")
public void setPageCount(Integer pageCount) {
this.pageCount = pageCount;
}

@JsonProperty("Excerpt")
public String getExcerpt() {
return excerpt;
}

@JsonProperty("Excerpt")
public void setExcerpt(String excerpt) {
this.excerpt = excerpt;
}

@JsonProperty("PublishDate")
public String getPublishDate() {
return publishDate;
}

@JsonProperty("PublishDate")
public void setPublishDate(String publishDate) {
this.publishDate = publishDate;
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