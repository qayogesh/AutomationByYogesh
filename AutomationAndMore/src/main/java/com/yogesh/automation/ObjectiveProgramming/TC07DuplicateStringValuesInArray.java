package com.yogesh.automation.ObjectiveProgramming;

import java.util.ArrayList;

public class TC07DuplicateStringValuesInArray {

	public static void main(String[] args) {
		TC07DuplicateStringValuesInArray obj = new TC07DuplicateStringValuesInArray();
		String[] arr = { "asd", "fgh", "hjk", "mno", "asd", "mno" };
		obj.getDuplicateStringValues(arr);
	}

	public void getDuplicateStringValues(String[] arr) {
		ArrayList<String> list = new ArrayList();
		for (int i = 0; i < arr.length; i++) {
			for (int j = i + 1; j < arr.length; j++) {
				if (arr[j].equalsIgnoreCase(arr[i])) {
					list.add(arr[j]);
				}
			}
		}

		System.out.println("Duplicate elements are:");
		for (String i : list) {
			System.out.print(i + ", ");
		}
	}
}
