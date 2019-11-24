package com.yogesh.automation.dataStructure;

import java.util.HashSet;

public class ArrayRemoveDuplicates {

	public static void main(String[] args) {
		ArrayRemoveDuplicates obj = new ArrayRemoveDuplicates();
		int[] arr = { 1, 1, 2, 2, 3, 3, 88 };
		obj.uniqueArrayEle(arr);
	}

	public void uniqueArrayEle(int[] arr) {
		int len = arr.length;
		HashSet set = new HashSet<>();
		for (int i = 0; i < len; i++) {
			if (set.add(arr[i]) == true) {
				System.out.println(arr[i]);
			}
		}
		System.out.println("unique array is " + set);
	}

}


/**
output
unique array is [1, 2, 3, 88]
*/